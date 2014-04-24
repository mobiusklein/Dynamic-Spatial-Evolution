// Generated by CoffeeScript 1.7.1
var Arena, FACINGS, IronConsumer, Random, Seeker, Siderophore, Walker, copy, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

if (typeof modules !== "undefined" && modules !== null) {
  console.log("Running in Node Mode");
  _ = require('lodash');
  Random = require('random').Random;
}

if (_ == null) {
  throw Error("Unable to find Lo-Dash");
}

if (Random == null) {
  throw Error("Unable to find Random");
}

copy = function(obj) {
  var duplicate;
  duplicate = JSON.parse(JSON.stringify(obj));
  return duplicate;
};

Arena = (function() {
  function Arena(argObj) {
    this.minX = argObj.minX;
    this.maxX = argObj.maxX;
    this.minY = argObj.minY;
    this.maxY = argObj.maxY;
    this.ticker = 0;
    this.creationQueue = [];
    this.actors = [];
    this.walkers = [];
    this.periodics = [];
    this.save = argObj.save || false;
    this.verbose = argObj.verbose || false;
    this.positions = {};
    this.history = [];
    this.random = new Random(argObj.randomSeed != null ? argObj.randomSeed : 1);
  }

  Arena.prototype.setPosition = function(obj) {
    return this.fillRegionWithPolygon(obj);
  };

  Arena.prototype.addWalker = function(opts) {
    var walker;
    if (opts == null) {
      opts = {};
    }
    opts = this.randomPositionWithin(opts);
    opts.random = this.random;
    walker = new Walker(opts);
    this.walkers.push(walker);
    return this.setPosition(walker);
  };

  Arena.prototype.addSeeker = function(opts) {
    var seeker;
    if (opts == null) {
      opts = {};
    }
    opts = this.randomPositionWithin(opts);
    opts.random = this.random;
    seeker = new Seeker(opts);
    this.actors.push(seeker);
    return this.setPosition(seeker);
  };

  Arena.prototype.addPeriodicWalker = function(opts) {
    var fn, self;
    opts = this.randomPositionWithin(opts);
    opts.frequency = opts.frequency || 20;
    fn = function() {
      self.addWalker(opts);
    };
    fn.frequency = opts.frequency;
    self = this;
    return this.periodics.push(fn);
  };

  Arena.prototype.addObject = function(obj) {
    obj.random = this.random;
    if (obj instanceof Seeker) {
      return this.actors.push(obj);
    } else {
      return this.walkers.push(obj);
    }
  };

  Arena.prototype.fillRegionWithPolygon = function(polygonObj) {
    var maxX, maxY, minX, minY, x, xAxisRange, y, yAxisRange, _i, _j, _len, _len1;
    minX = polygonObj.x - polygonObj.size;
    minY = polygonObj.y - polygonObj.size;
    minX = minX >= 0 ? minX : 0;
    minY = minY >= 0 ? minY : 0;
    maxX = polygonObj.x + polygonObj.size;
    maxY = polygonObj.y + polygonObj.size;
    maxX = maxX > this.maxX ? this.maxX : maxX;
    maxY = maxY > this.maxY ? this.maxY : maxY;
    xAxisRange = (function() {
      var _i, _results;
      _results = [];
      for (x = _i = minX; minX <= maxX ? _i <= maxX : _i >= maxX; x = minX <= maxX ? ++_i : --_i) {
        _results.push(x);
      }
      return _results;
    })();
    yAxisRange = (function() {
      var _i, _results;
      _results = [];
      for (y = _i = minY; minY <= maxY ? _i <= maxY : _i >= maxY; y = minY <= maxY ? ++_i : --_i) {
        _results.push(y);
      }
      return _results;
    })();
    for (_i = 0, _len = xAxisRange.length; _i < _len; _i++) {
      x = xAxisRange[_i];
      for (_j = 0, _len1 = yAxisRange.length; _j < _len1; _j++) {
        y = yAxisRange[_j];
        if (this.positions[x] == null) {
          this.positions[x] = {};
        }
        if (this.positions[x][y] == null) {
          this.positions[x][y] = [];
        }
        this.positions[x][y].push(polygonObj);
      }
    }
    return this.positions;
  };

  Arena.prototype.randomPositionWithin = function(opts) {
    if (opts == null) {
      opts = {};
    }
    opts.x = Math.floor(opts.x) || this.random.randint(0, this.maxX);
    opts.y = Math.floor(opts.y) || this.random.randint(0, this.maxY);
    return opts;
  };

  Arena.prototype.pathClear = function(obj, newPos) {
    var lastX, lastY, solid, x, y, _i, _j, _ref, _ref1, _ref2, _ref3;
    lastX = obj.x;
    for (x = _i = _ref = obj.x, _ref1 = obj.x + newPos.x; _ref <= _ref1 ? _i <= _ref1 : _i >= _ref1; x = _ref <= _ref1 ? ++_i : --_i) {
      if (this.positions[x] == null) {
        this.positions[x] = {};
      }
      lastY = obj.y;
      for (y = _j = _ref2 = obj.y, _ref3 = obj.y + newPos.y; _ref2 <= _ref3 ? _j <= _ref3 : _j >= _ref3; y = _ref2 <= _ref3 ? ++_j : --_j) {
        if (this.positions[x][y] == null) {
          this.positions[x][y] = [];
        }
        solid = this.positions[x][y].some(function(i) {
          return i.solid;
        });
        if (solid) {
          return [lastX - obj.x, lastY - obj.y];
        }
        lastY = y;
      }
      lastX = x;
    }
    return [newPos.x, newPos.y];
  };

  Arena.prototype.tick = function() {
    var dead, deceased, self, survivors;
    if (this.save) {
      this.history.push(this.positions);
    }
    this.ticker += 1;
    this.positions = {};
    deceased = {};
    self = this;
    this.walkers.forEach(function(obj, i) {
      obj.step(self);
      self.setPosition(obj);
    });
    dead = [];
    this.actors.forEach(function(obj, i) {
      dead = obj.step(self);
      dead.forEach(function(o) {
        deceased[o.id] = true;
      });
      self.setPosition(obj);
    });
    survivors = [];
    this.walkers.forEach(function(obj, i) {
      if (deceased[obj.id] == null) {
        survivors.push(obj);
      } else {
        obj.state = "dead";
      }
    });
    this.walkers = survivors;
    survivors = [];
    this.actors.forEach(function(obj, i) {
      if (deceased[obj.id] === undefined) {
        survivors.push(obj);
      } else {
        obj.state = "dead";
      }
    });
    this.actors = survivors;
    this.periodics.forEach(function(func, i) {
      if (self.ticker % func.frequency === 0) {
        func();
      }
    });
  };

  return Arena;

})();

Walker = (function() {
  Walker.WALKER_COUNT = 0;

  function Walker(argObj) {
    this.id = "walker-" + Walker.WALKER_COUNT;
    this.x = argObj.x;
    this.y = argObj.y;
    this.size = (argObj.size != null ? argObj.size : 1);
    this.stepSize = (argObj.stepSize != null ? argObj.stepSize : 1);
    this.state = argObj.state;
    this.type = argObj.type;
    this.solid = false;
    this.value = argObj.value != null ? argObj.value : 1;
    this.age = 0;
    this.mark = false;
    Walker.WALKER_COUNT += 1;
    this.random = argObj.random ? argObj.random : new Random(1);
    this.stepStartHook = argObj.stepStart != null ? argObj.stepStart : [];
    this.preMoveHook = argObj.preMove != null ? argObj.preMove : [];
    this.postMoveHook = argObj.postMove != null ? argObj.postMove : [];
    this.stepEndHook = argObj.stepEndHook != null ? argObj.stepEndHook : [];
  }

  Walker.prototype.stepStart = function(boundsObj) {
    var fn, _i, _len, _ref, _results;
    _ref = this.stepStartHook;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      fn = _ref[_i];
      _results.push(fn.apply(this, boundsObj));
    }
    return _results;
  };

  Walker.prototype.preMove = function(boundsObj) {
    var fn, _i, _len, _ref, _results;
    _ref = this.preMoveHook;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      fn = _ref[_i];
      _results.push(fn.apply(this, boundsObj));
    }
    return _results;
  };

  Walker.prototype.postMove = function(boundsObj) {
    var fn, _i, _len, _ref, _results;
    _ref = this.postMoveHook;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      fn = _ref[_i];
      _results.push(fn.apply(this, boundsObj));
    }
    return _results;
  };

  Walker.prototype.stepEnd = function(boundsObj) {
    var fn, _i, _len, _ref, _results;
    _ref = this.stepEndHook;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      fn = _ref[_i];
      _results.push(fn.apply(this, boundsObj));
    }
    return _results;
  };

  Walker.prototype.step = function(boundsObj) {
    var newX, newY, _ref;
    this.age += 1;
    this.stepStart(boundsObj);
    this.preMove(boundsObj);
    newX = this.random.randint(-this.stepSize, this.stepSize);
    newY = this.random.randint(-this.stepSize, this.stepSize);
    _ref = boundsObj.pathClear(this, {
      x: newX,
      y: newY
    }), newX = _ref[0], newY = _ref[1];
    this.x += newX;
    this.y += newY;
    this.within(boundsObj);
    this.postMove(boundsObj);
    return this.stepEnd(boundsObj);
  };

  Walker.prototype.within = function(boundsObj, escape) {
    if (escape == null) {
      escape = true;
    }
    if (this.x <= boundsObj.minX) {
      if (escape) {
        this.x += this.stepSize * 1 + this.size;
      }
    } else {
      if (this.x >= boundsObj.maxX) {
        if (escape) {
          this.x -= this.stepSize * 1 + this.size;
        }
      }
    }
    if (this.y <= boundsObj.minY) {
      if (escape) {
        this.y += this.stepSize * 1 + this.size;
      }
    } else {
      if (this.y >= boundsObj.maxY) {
        if (escape) {
          this.y -= this.stepSize * 1 + this.size;
        }
      }
    }
  };

  return Walker;

})();

FACINGS = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

Seeker = (function(_super) {
  __extends(Seeker, _super);

  Seeker.SEEKER_COUNT = 0;

  function Seeker(argObj) {
    Seeker.__super__.constructor.call(this, argObj);
    this.id = "seeker-" + Seeker.SEEKER_COUNT;
    this.canEat = argObj.canEat != null ? argObj.canEat : ['food'];
    this.solid = true;
    this.facing = (argObj.facing == null ? [1, 1] : argObj.facing);
    this.tumbleFrequency = argObj.tumbleFrequency || [0.01, 0.1];
    this.heritableTraits = copy(argObj.heritableTraits);
    this.size = (argObj.size == null ? 5 : argObj.size);
    this.stepSize = (argObj.stepSize == null ? 5 : argObj.stepSize);
    this.totalFood = 100;
    this.minimumReplicationFoodThreshold = argObj.minimumReplicationFoodThreshold || 500;
    this.BMR = argObj.BMR || function(optsObj) {
      return this.totalFood -= this.stepSize / 1000;
    };
    this.minimumReplicationDelay = argObj.minimumReplicationDelay || 10;
    this.eaten = 0;
    this.lastEaten = [0, 0, 0, 0];
    Seeker.SEEKER_COUNT += 1;
  }

  Seeker.prototype.step = function(boundsObj) {
    var actionChoice, close, closeThings, newFacing, newX, newY, o, remove, self, tumbleProb, _i, _j, _len, _len1, _ref, _ref1;
    this.BMR();
    self = this;
    this.eaten = 0;
    tumbleProb = (this.eaten > 1 ? this.tumbleFrequency[0] : this.tumbleFrequency[1]);
    actionChoice = this.random.random();
    if (actionChoice < tumbleProb) {
      newFacing = this.facing;
      while (this.facing === newFacing) {
        this.facing = this.random.choice(FACINGS);
      }
    }
    closeThings = this.sense(boundsObj);
    remove = [];
    for (_i = 0, _len = closeThings.length; _i < _len; _i++) {
      close = closeThings[_i];
      for (_j = 0, _len1 = close.length; _j < _len1; _j++) {
        o = close[_j];
        if ((_ref = o.type, __indexOf.call(this.canEat, _ref) >= 0) && !o.mark) {
          this.totalFood += o.value;
          this.eaten += 1;
          o.mark = true;
          remove.push(o);
          if (this.totalFood > this.minimumReplicationFoodThreshold && this.age > this.minimumReplicationDelay) {
            this.replicate(boundsObj);
            remove.push(this);
            return remove;
          }
        }
      }
    }
    newX = this.stepSize * this.facing[0];
    newY = this.stepSize * this.facing[1];
    _ref1 = boundsObj.pathClear(self, {
      x: newX,
      y: newY
    }), newX = _ref1[0], newY = _ref1[1];
    this.x += newX;
    this.y += newY;
    this.age += 1;
    this.within(boundsObj);
    if (this.totalFood < 0) {
      this.mark = true;
      remove.push(this);
    }
    if (this.totalFood < 50) {
      this.state = "starving";
    } else {
      this.state = "";
    }
    return remove;
  };

  Seeker.prototype.within = function(boundsObj, escape) {
    var corrected;
    if (escape == null) {
      escape = true;
    }
    corrected = false;
    if (this.x <= boundsObj.minX) {
      corrected = true;
      if (escape) {
        this.x += this.stepSize * 1;
        this.facing[0] *= -1;
      }
    } else if (this.x >= boundsObj.maxX) {
      corrected = true;
      if (escape) {
        this.x -= this.stepSize * 1;
        this.facing[0] *= -1;
      }
    }
    if (this.y <= boundsObj.minY) {
      corrected = true;
      if (escape) {
        this.y += this.stepSize * 1;
        this.facing[1] *= -1;
      }
    } else if (this.y >= boundsObj.maxY) {
      corrected = true;
      if (escape) {
        this.facing[1] *= -1;
        this.y -= this.stepSize * 1;
      }
    }
  };

  Seeker.prototype.sense = function(arenaObj) {
    var beingsSensed, maxX, maxY, midX, midY, minX, minY, other, self, x, y, _i, _j, _k, _len, _ref;
    midX = this.x;
    midY = this.y;
    maxX = midX + (this.size + 1);
    maxY = midY + (this.size + 1);
    minX = midX - (this.size + 1);
    minY = midY - (this.size + 1);
    beingsSensed = [];
    self = this;
    for (x = _i = minX; minX <= maxX ? _i <= maxX : _i >= maxX; x = minX <= maxX ? ++_i : --_i) {
      if (x < 0) {
        continue;
      }
      if (x > arenaObj.maxX) {
        continue;
      }
      for (y = _j = minY; minY <= maxY ? _j <= maxY : _j >= maxY; y = minY <= maxY ? ++_j : --_j) {
        if (y < 0) {
          continue;
        }
        if (y > arenaObj.maxY) {
          continue;
        }
        if (arenaObj.positions[x] != null) {
          if (arenaObj.positions[x][y] != null) {
            _ref = arenaObj.positions[x][y];
            for (_k = 0, _len = _ref.length; _k < _len; _k++) {
              other = _ref[_k];
              if (other.id !== this.id) {
                beingsSensed.push(arenaObj.positions[x][y]);
              }
            }
          }
        }
      }
    }
    return beingsSensed;
  };

  Seeker.prototype.death = function(boundsObj) {
    console.log(this.id + " died");
    return this.mark = true;
  };

  Seeker.prototype.replicate = function(boundsObj) {
    this.mark = true;
    boundsObj.addSeeker(this);
    boundsObj.addSeeker(this);
  };

  return Seeker;

})(Walker);

Siderophore = (function(_super) {
  __extends(Siderophore, _super);

  function Siderophore(argObj) {
    if (argObj.stepStart == null) {
      argObj.stepStart = [];
    }
    argObj.stepStart.push(function(paramObj) {
      if (this.age > 50) {
        return this.react();
      }
    });
    argObj.type = 'siderophore';
    argObj.value = 0;
    Siderophore.__super__.constructor.call(this, argObj);
  }

  Siderophore.prototype.react = function() {
    this.type = 'bound-siderophore';
    return this.value = 6;
  };

  return Siderophore;

})(Walker);

IronConsumer = (function(_super) {
  __extends(IronConsumer, _super);

  IronConsumer.siderophoreCost = 3;

  function IronConsumer(argObj) {
    if (argObj.canEat == null) {
      argObj.canEat = [];
    }
    argObj.canEat.push('bound-siderophore');
    if (argObj.stepStart == null) {
      argObj.stepStart = [];
    }
  }

  IronConsumer.prototype.produceSiderophore = function(boundsObj) {
    return this.totalFood -= IronConsumer.siderophoreCost;
  };

  return IronConsumer;

})(Seeker);

try {
  exports.Walker = Walker;
  exports.Seeker = Seeker;
  exports.Arena = Arena;
  exports.Utils = {
    fillRegionWithPolygon: fillRegionWithPolygon,
    copy: copy
  };
} catch (_error) {}

//# sourceMappingURL=model.map
