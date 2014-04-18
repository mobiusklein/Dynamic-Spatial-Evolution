// Generated by CoffeeScript 1.7.1
var Arena, FACINGS, Seeker, Walker,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

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
  }

  Arena.prototype.setPosition = function(obj) {
    return this.fillRegionWithPolygon(obj);
  };

  Arena.prototype.addWalker = function(opts) {
    var walker;
    opts = (opts === undefined ? {} : opts);
    opts = this.randomPositionWithin(opts);
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
    seeker = new Seeker(opts);
    this.actors.push(seeker);
    return this.setPosition(seeker);
  };

  Arena.prototype.addPeriodicWalker = function(opts) {
    var f, self;
    opts = this.randomPositionWithin(opts);
    opts.frequency = opts.frequency || 20;
    f = function() {
      self.addWalker(opts);
    };
    f.frequency = opts.frequency;
    self = this;
    return this.periodics.push(f);
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
    opts = (opts === undefined ? {} : opts);
    opts.x = Math.floor(opts.x) || Math.floor(Math.random() * this.maxX);
    opts.y = Math.floor(opts.y) || Math.floor(Math.random() * this.maxY);
    return opts;
  };

  Arena.prototype.pathClear = function(obj, newPos) {
    var solid, x, y, _i, _j, _ref, _ref1, _ref2, _ref3;
    console.log(obj);
    console.log("New Pos", newPos.x, newPos.y);
    for (x = _i = _ref = obj.x, _ref1 = obj.x + newPos.x; _ref <= _ref1 ? _i <= _ref1 : _i >= _ref1; x = _ref <= _ref1 ? ++_i : --_i) {
      if (this.positions[x] == null) {
        this.positions[x] = {};
      }
    }
    for (y = _j = _ref2 = obj.y, _ref3 = obj.y + newPos.y; _ref2 <= _ref3 ? _j <= _ref3 : _j >= _ref3; y = _ref2 <= _ref3 ? ++_j : --_j) {
      if (this.positions[x][y] == null) {
        this.positions[x][y] = [];
      }
      solid = this.positions[x][y].some(function(i) {
        return i.solid;
      });
      if (solid) {
        return [x - obj.x, y - obj.y];
      }
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
      if (deceased[obj.id] === undefined) {
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
  function Walker(argObj) {
    this.id = "walker-" + Walker.WALKER_COUNT;
    this.x = argObj.x;
    this.y = argObj.y;
    this.size = (argObj.size === undefined ? 5 : argObj.size);
    this.stepSize = (argObj.stepSize === undefined ? 1 : argObj.stepSize);
    this.state = argObj.state;
    this.type = argObj.type;
    this.edible = true;
    this.solid = false;
    this.age = 0;
    this.mark = false;
    Walker.WALKER_COUNT += 1;
  }

  Walker.WALKER_COUNT = 0;

  Walker.prototype.step = function(boundsObj) {
    var newX, newY;
    newX = Walker.random(this.stepSize);
    newY = Walker.random(this.stepSize);
    this.x += newX;
    this.y += newY;
    this.age += 1;
    return this.within(boundsObj);
  };

  Walker.prototype.within = function(boundsObj, escape) {
    escape = (escape === undefined ? true : escape);
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

  Walker.random = function(stepSize) {
    var value;
    value = Math.floor(Math.random() * (stepSize * 2 + 1) - stepSize);
    return value;
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
    this.edible = false;
    this.solid = true;
    this.facing = (argObj.facing === undefined ? [1, 1] : argObj.facing);
    this.tumbleFrequency = argObj.tumbleFrequency || [0.01, 0.1];
    this.size = (argObj.size === undefined ? 5 : argObj.size);
    this.stepSize = (argObj.stepSize === undefined ? 2 : argObj.stepSize);
    this.totalFood = 100;
    this.minimumReplicationFoodThreshold = argObj.minimumReplicationFoodThreshold || 500;
    this.BMR = argObj.BMR || 0.01;
    this.minimumReplicationDelay = argObj.minimumReplicationDelay || 10;
    this.eaten = 0;
    this.lastEaten = [0, 0, 0, 0];
    Seeker.SEEKER_COUNT += 1;
  }

  Seeker.prototype.step = function(boundsObj) {
    var actionChoice, closeThings, edibles, newFacing, newX, newY, self, tumbleProb;
    this.totalFood -= this.BMR;
    if (this.totalFood > this.minimumReplicationFoodThreshold && this.age > this.minimumReplicationDelay) {
      this.replicate(boundsObj);
      return [this];
    } else if (this.totalFood < 50) {
      this.state = "starving";
    } else {
      this.state = "";
    }
    self = this;
    this.eaten = 0;
    tumbleProb = (this.eaten > 1 ? this.tumbleFrequency[0] : this.tumbleFrequency[1]);
    actionChoice = Math.random();
    if (actionChoice < tumbleProb) {
      newFacing = this.facing;
      while (this.facing === newFacing) {
        this.facing = FACINGS[Math.floor(Math.random() * FACINGS.length)];
      }
    }
    closeThings = this.sense(boundsObj);
    edibles = [];
    closeThings.forEach(function(close) {
      return close.being.forEach(function(o) {
        if (o.edible) {
          self.totalFood += o.size;
          self.eaten += 1;
          return edibles.push(o);
        }
      });
    });
    newX = this.stepSize * this.facing[0];
    newY = this.stepSize * this.facing[1];
    this.x += newX;
    this.y += newY;
    this.age += 1;
    this.within(boundsObj);
    if (this.totalFood < 0) {
      return [this];
    } else {
      return edibles;
    }
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
    var beingsSensed, maxX, maxY, midX, midY, minX, minY, positionsSensed, self, x, y, _i, _j;
    midX = this.x;
    midY = this.y;
    maxX = midX + (this.size + 1);
    maxY = midY + (this.size + 1);
    minX = midX - (this.size + 1);
    minY = midY - (this.size + 1);
    positionsSensed = [];
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
            arenaObj.positions[x][y].forEach(function(o, i) {
              if (o.id !== self.id) {
                beingsSensed.push({
                  pos: [x, y],
                  being: arenaObj.positions[x][y]
                });
              }
            });
          }
        }
      }
    }
    if (beingsSensed.length > 1) {
      console.log(beingsSensed);
    }
    return beingsSensed;
  };

  Seeker.prototype.death = function(boundsObj) {
    return console.log(this.id + " died");
  };

  Seeker.prototype.replicate = function(boundsObj) {
    boundsObj.addSeeker(this);
    boundsObj.addSeeker(this);
  };

  return Seeker;

})(Walker);

try {
  exports.Walker = Walker;
  exports.Seeker = Seeker;
  exports.Arena = Arena;
  exports.Utils = {
    fillRegionWithPolygon: fillRegionWithPolygon
  };
} catch (_error) {}

//# sourceMappingURL=model.map
