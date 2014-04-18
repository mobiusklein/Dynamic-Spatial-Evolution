fs = require 'fs'
{exec} = require 'child_process'

task 'sbuild', 'Build project .coffee to .js', ->
  exec 'coffee --compile -bm . ', (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr
