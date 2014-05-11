model = require './model'
fs = require 'fs'
util = require 'util'

{Arena, Blockade, Walker, Seeker, SiderophoreProducer, Siderophore, mutate, StrainTree, EntityClassRegistry} = model

arena = new Arena({minX: 0, maxX: 750, minY: 0, maxY: 750})

# Set up blockades
topBlock = {x: 375, y:50, height:175, width:20}
arena.addObject( new Blockade(topBlock) )
bottomBlock = {x: 375,  y:450, height:175, width:20}
arena.addObject( new Blockade(bottomBlock) )

for i in [1..5]
    arena.addObject(new SiderophoreProducer({}), true)

for i in [1..1]
    arena.addSeeker({type: "e-coli", canEat: ["glucose", "bound-siderophore"]}, true)

util.log "Running"

n = 10000

for i in [1..n]
    arena.tick()

util.log "Ran #{n} ticks"

