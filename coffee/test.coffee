model = require './model'
SiderophoreProducer = model

arena = new model.Arena({minX: 0, maxX: 500, minY: 0, maxY: 500})

for i in [1..5]
	arena.addSeeker({type: "E-coli", canEat: ["glucose", "bound-siderophore"]})
	arena.addObject(new SiderophoreProducer({}))
