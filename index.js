#!/usr/bin/env node
const { spawn } = require('node:child_process');
const { program } = require('commander');
var request = require('sync-request');
var waitUntil = require('wait-until');

program
    .option('-t, --timeout <number>', 'percysync timeout (seconds)', 20)
    .option('-i, --idle <number>', 'minimum amount of time to wait before stating to poll the Percy API (seconds)', 10)

program.parse();

const options = program.opts();
const command = spawn(program.args[0], program.args.slice(1));
const regex = /\[percy\] Finalized build #\d+: https:\/\/percy\.io\/(?<project_id>\w+)\/(.+)\/builds\/(?<build_id>\d+)/gm;
var build_id = false;
command.stdout.on('data', (data) => {
    console.log(data.toString());
    let m;
    if(m = regex.exec(data.toString()))
    {
        build_id = m['groups']['build_id']
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