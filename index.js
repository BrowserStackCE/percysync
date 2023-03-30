#!/usr/bin/env node
const spawn = require('cross-spawn');
const { program } = require('commander');
var request = require('sync-request');
const waitSync = require('wait-sync');

program
    .option('-t, --timeout <number>', 'percysync timeout (seconds)')
    .option('-i, --idle <number>', 'minimum amount of time to wait before stating to poll the Percy API (seconds)')
    .option('-v, --verbose <boolean>', 'Percy wait verbose ouput', false)

program.parse();

const options = program.opts();
const command = spawn(program.args[0], program.args.slice(1), { shell: process.env.SHELL });
const regex = /\[percy\] Finalized build #\d+: https:\/\/percy\.io\/(\w+)\/(?<project_slug>.+)\/builds\/(?<build_id>\d+)/gm;
var build_id = false;
var project_slug = false;
var buildStartTime = Date.now()

const median = arr => {
    const mid = Math.floor(arr.length / 2),
      nums = [...arr].sort((a, b) => a - b);
    return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  };

command.stdout.on('data', (data) => {
    console.log(`${data}`);
    let m;
    if(m = regex.exec(data.toString()))
    {
        build_id = m['groups']['build_id']
        project_slug = m['groups']['project_slug']
    }
});

command.stderr.on('data', (data) => {
  console.error(`${data}`);

});

command.on(
  'close', (code) => {
    if(build_id)
    {
        var build_status
        console.log("[percysync] Waiting for Percy to finish the visual report");
        if(!options['idle'])
        {
            var res = request('GET', 'https://percy.io/api/v1/projects?project_slug='+ project_slug, {
                headers: { 'Authorization': "Token "+ process.env["PERCY_TOKEN"]},
            });
            var project_id = JSON.parse(res.getBody('utf8'))["data"]["id"]
            var res = request('GET', 'https://percy.io/api/v1/builds?project_id='+ project_id+ "&page\[limit\]=50", {
                headers: { 'Authorization': "Token "+ process.env["PERCY_TOKEN"]},
            });
        
            var finished_builds = JSON.parse(res.getBody('utf8'))["data"].filter(aBuild => aBuild['attributes']['finished-at'])
            if(finished_builds)
            {
                var build_durations = finished_builds.map(aBuild => 
                    {
                        return Date.parse(aBuild['attributes']['finished-at']) - Date.parse(aBuild['attributes']['created-at'])
                    });
                const testSuiteFinishedTime = Date.now();
                const testSuiteDuration = testSuiteFinishedTime - buildStartTime;
                options['idle'] = Math.floor((median(build_durations)*0.9 / 1000) - (testSuiteDuration/1000));
                console.log("[percysync] We expect the build to take around " + options['idle'] + " seconds");
            }
        }
        options['idle'] = options['idle']?options['idle']:30
        options['timeout'] = options['timeout']?options['timeout']:120
       
        waitSync(options['idle']); 

        var percywaitOptions = ["percy", "build:wait", "--fail-on-changes", "--pass-if-approved", "--build", build_id, "--timeout", options['timeout']*1000];
        if(options['verbose'])
            percywaitOptions.push("--verbose");
        const percyWait = spawn("npx", percywaitOptions,  {stdio: "inherit"});
        percyWait.on('close', (buildCode) => {
            process.exit(code + buildCode)
        });
        
    }
    else
    {
        process.exit(code);
    }

});

