#!/usr/bin/env node
const { spawn } = require('node:child_process');
const { program } = require('commander');
var request = require('sync-request');
var waitUntil = require('wait-until');
const { finished } = require('node:stream');

program
    .option('-t, --timeout <number>', 'percysync timeout (seconds)')
    .option('-i, --idle <number>', 'minimum amount of time to wait before stating to poll the Percy API (seconds)')

program.parse();

const options = program.opts();
const command = spawn(program.args[0], program.args.slice(1));
const regex = /\[percy\] Finalized build #\d+: https:\/\/percy\.io\/(\w+)\/(?<project_slug>.+)\/builds\/(?<build_id>\d+)/gm;
var build_id = false;
var project_slug = false;


const median = arr => {
    const mid = Math.floor(arr.length / 2),
      nums = [...arr].sort((a, b) => a - b);
    return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  };

command.stdout.on('data', (data) => {
    console.log(data.toString());
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
                options['idle'] = median(build_durations)*0.9 / 1000.
                options['timeout'] = options['idle'] + 60.
                console.log("[percysync] We expect the build to take around " + options['idle'] + " seconds");
            }
        }
        options['idle'] = options['idle']?options['idle']:30
        options['timeout'] = options['timeout']?options['idle']:120
        var percyRenderingStartTime = Date.now()
        waitUntil()
            .interval(2000)
            .times(options['timeout']*1000/2000)
            .condition(function() {
                if(Date.now() - percyRenderingStartTime < options['idle'] * 1000 ){
                    return false
                }
                var res = request('GET', 'https://percy.io/api/v1/builds/'+ build_id, {
                    headers: { 'Authorization': "Token "+ process.env["PERCY_TOKEN"]},
                });

                build_status=JSON.parse(res.getBody('utf8'));
                return (build_status['data']['attributes']['state']!='processing' ? true : false);
            })
            .done(function(result) {
                if(result){
                    console.log("[percysync] Build state: "+ build_status['data']['attributes']['review-state'])
                    console.log("[percysync] Snapshot taken: "+ build_status['data']['attributes']['total-snapshots'])
                    console.log("[percysync] Nb of diff: "+ build_status['data']['attributes']['total-comparisons-diff'])
                    var percyStatus = (build_status['data']['attributes']['review-state'] == "approved")?0:1
                    process.exit(code + percyStatus)
                } else {
                    console.log("[percysync] Could retrieve Percy build last state.")
                    process.exit(1)
                }
            });

        
    }
   

});

