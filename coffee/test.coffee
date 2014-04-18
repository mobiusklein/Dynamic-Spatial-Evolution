model = require './model'

arena = new model.Arena({minX: 0, maxX: 500, minY: 0, maxY: 500})

arena.addSeeker()

console.log arena

arena.tick()

arena.log arena