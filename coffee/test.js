// Generated by CoffeeScript 1.7.1
var Arena, Blockade, EntityClassRegistry, Seeker, Siderophore, SiderophoreProducer, StrainTree, Walker, arena, bottomBlock, fs, i, model, mutate, n, topBlock, util, _i, _j, _k;

model = require('./model');

fs = require('fs');

util = require('util');

Arena = model.Arena, Blockade = model.Blockade, Walker = model.Walker, Seeker = model.Seeker, SiderophoreProducer = model.SiderophoreProducer, Siderophore = model.Siderophore, mutate = model.mutate, StrainTree = model.StrainTree, EntityClassRegistry = model.EntityClassRegistry;

arena = new Arena({
  minX: 0,
  maxX: 750,
  minY: 0,
  maxY: 750
});

topBlock = {
  x: 375,
  y: 50,
  height: 175,
  width: 20
};

arena.addObject(new Blockade(topBlock));

bottomBlock = {
  x: 375,
  y: 450,
  height: 175,
  width: 20
};

arena.addObject(new Blockade(bottomBlock));

for (i = _i = 1; _i <= 5; i = ++_i) {
  arena.addObject(new SiderophoreProducer({}), true);
}

for (i = _j = 1; _j <= 1; i = ++_j) {
  arena.addSeeker({
    type: "e-coli",
    canEat: ["glucose", "bound-siderophore"]
  }, true);
}

util.log("Running");

n = 10000;

for (i = _k = 1; 1 <= n ? _k <= n : _k >= n; i = 1 <= n ? ++_k : --_k) {
  arena.tick();
}

util.log("Ran " + n + " ticks");

//# sourceMappingURL=test.map
