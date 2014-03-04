/* ===============================================
    Arena
    Defines an object which describes an area which actors
    and walkers move within. 
   =============================================== */
function Arena(argObj){
    this.minX = argObj.minX;
    this.maxX = argObj.maxX;
    this.minY = argObj.minY;
    this.maxY = argObj.maxY;
    
    this.actors = []
    this.walkers = []
    this.save = argObj.save||false
    this.verbose = argObj.verbose||false

    this.positions = {};
    this.history = [];
}

Arena.prototype.setPosition = function(obj){
    /*console.log("Before setPosition", obj)*/
    if(!Array.isArray(this.positions[obj.x])){
        this.positions[obj.x] = {};
    }
    if (this.positions[obj.x][obj.y] === undefined){
        this.positions[obj.x][obj.y] = [obj]
    } else {
        this.positions[obj.x][obj.y].push(obj)
    }
    /*console.log("After: ", obj)*/
}

Arena.prototype.addWalker = function(opts){
    opts = opts === undefined ? {} : opts;
    opts = this.randomPositionWithin(opts)
    var walker = new Walker(opts)
    
    this.walkers.push(walker)
    
}

Arena.prototype.addSeeker = function(opts){
    opts = opts === undefined ? {} : opts;
    opts = this.randomPositionWithin(opts)
    var seeker = new Seeker(opts)
    
    this.actors.push(seeker)
    
}

Arena.prototype.randomPositionWithin = function(opts){
    opts = opts === undefined ? {} : opts
    opts.x = Math.floor(Math.random() * this.maxX)
    opts.y = Math.floor(Math.random() * this.maxY)
    return opts
}

Arena.prototype.tick = function(){
    if(this.save){
        this.history.push(this.positions);
    }
    this.positions = {}
    var deceased = {}
    var self = this;
    this.walkers.forEach(function(obj, i){
        obj.step(self)
        arena.setPosition(obj)
    })

    this.actors.forEach(function(obj, i){
        dead = (obj.step(self))
        dead.forEach(function(o){
            console.log(o)
            deceased[o.id] = true
        })
        arena.setPosition(obj)
    })
    //console.log(deceased)
    var survivors = []
    this.walkers.forEach(function(obj,i){
        if(deceased[obj.id] === undefined){
            survivors.push(obj)
        } else {
            obj.state = 'dead'
        }
    })
    this.walkers = survivors;
    survivors = []
    this.actors.forEach(function(obj,i){
        if(deceased[obj.id] === undefined){
            survivors.push(obj)
        } else {
            obj.state = "dead"
        }
    })
    this.actors = survivors
}

/* ===============================================
    Walker
    Defines an object which traverses the arena in a random walk. 
   =============================================== */
WALKER_COUNT = 0
function Walker(argObj){
    this.id = "WALKER " + WALKER_COUNT
    this.x = argObj.x;
    this.y = argObj.y;
    this.size = argObj.size === undefined ? 5 : argObj.size
    this.stepSize = argObj.stepSize === undefined ? 1 : argObj.stepSize;
    this.state = argObj.state;
    
    this.age = 0;

    WALKER_COUNT += 1
}

Walker.prototype.step = function(boundsObj) {
    var newX = Walker.random(this.stepSize)
    var newY = Walker.random(this.stepSize)
    this.x += newX;
    this.y += newY;
    this.age += 1;
    this.within(boundsObj)
}

Walker.prototype.within = function(boundsObj, escape) {
    escape = escape === undefined ? true : escape
    if (this.x <= boundsObj.minX) {
        if(escape) this.x += this.stepSize * 1 + this.size;
        
    } else if (this.x >= boundsObj.maxX) {
        if(escape) this.x -= this.stepSize * 1 + this.size;
    }

    if (this.y <= boundsObj.minY) {
        if(escape) this.y += this.stepSize * 1 + this.size;
    } else if (this.y >= boundsObj.maxY) {
        if(escape) this.y -= this.stepSize * 1 + this.size;
    }
}

/* 
Generate symmetric random number between @stepSize and -@stepSize
*/
Walker.random = function(stepSize){
    var value = Math.floor(Math.random() * (stepSize * 2 + 1) - stepSize);
    return value
}
/* ===============================================
    Seeker
    Defines an object which traverses the arena in tumbles and runs
   =============================================== */
SEEKER_COUNT = 0;
FACINGS = [
    [0,1],
    [1,0],
    [0,-1],
    [-1,0],
    [1,1],
    [1,-1],
    [-1,1],
    [-1,-1]
]
var Seeker = function(argObj){
    //Inherit from Walker constructor
    Walker.call(this, argObj)
    
    //Override the Walker ID
    this.id = "SEEKER " + SEEKER_COUNT

    //Movement
    //Seekers have a facing in addition to Walker's .x and .y fields
    this.facing = argObj.facing === undefined ? [1,1] : argObj.facing
    //A pair of the form [Recent Fed, No Recent Fed]
    this.tumbleFrequency = argObj.tumbleFrequency

    //Apply Seeker's defaults in place of Walker defaults
    this.size = argObj.size === undefined ? 15 : argObj.size
    this.stepSize = argObj.stepSize === undefined ? 2 : argObj.stepSize

    this.totalFood = 100;
    this.minimumReplicationFoodThreshold = argObj.minimumReplicationFoodThreshold;

    this.BMR = argObj.BMR;
    this.minimumReplicationDelay = argObj.minimumReplicationDelay;


    this.eaten = 0;
    this.lastEaten = [0, 0, 0, 0]

    SEEKER_COUNT+=1
}

//Inherit Walker prototype
Seeker.prototype = Object.create(Walker.prototype);

Seeker.prototype.step = function(boundsObj){
    var newEatenHistory = []
    var self = this
    this.lastEaten.forEach(function(o, i){ 
    var val = (i !== 0) ? 
        self.lastEaten[i - 1]
        : self.eaten; 
    newEatenHistory[i] = val
    })
    this.lastEaten = newEatenHistory;
    this.eaten = 0
    var tumbleProb = this.eaten > 1 ? 0.01 : 0.1;
    var actionChoice = Math.random();
    
    //Tumble and change facing
    if(actionChoice < tumbleProb){
        var newFacing = this.facing;
        while(this.facing == newFacing){
            this.facing = FACINGS[Math.floor(Math.random() * FACINGS.length)]
        }
    }
    //Compute step magnitude and apply facing direction
    var newX = this.stepSize * this.facing[0]
    var newY = this.stepSize * this.facing[1]

    this.x += newX
    this.y += newY

    this.age += 1
    this.within(boundsObj)

    //Sense Beings
    var closeThings = this.sense(boundsObj);
    var edibles = []
    closeThings.forEach(function(close){
        close.being.forEach(function(o){
            if(o.size < self.size){
                self.totalFood += close.being.size
                self.eaten += 1;
                edibles.push(o)
            }
        })
    })

    return edibles
}


Seeker.prototype.within = function(boundsObj, escape) {
    escape = escape === undefined ? true : escape
    if (this.x <= boundsObj.minX) {
        if(escape) {
            this.x += this.stepSize * 1 + this.size;
            this.facing[0] *= -1
        }
        
    } else if (this.x >= boundsObj.maxX) {
        if(escape){
            this.x -= this.stepSize * 1 + this.size;
            this.facing[0] *= -1
        }
    }

    if (this.y <= boundsObj.minY) {
        if(escape) {
            this.y += this.stepSize * 1 + this.size;
            this.facing[1] *= -1
        }
    } else if (this.y >= boundsObj.maxY) {
        if(escape){
            this.facing[1] *= -1
            this.y -= this.stepSize * 1 + this.size;
        }

    }
}

Seeker.prototype.sense = function(arenaObj){
    var midX = this.x,
        midY = this.y,
        maxX = midX + (this.size + 1),
        maxY = midY + (this.size + 1),
        minX = midX - (this.size + 1),
        minY = midY - (this.size + 1),
        positionsSensed = [],
        beingsSensed = [],
        self = this;

    for(var x = minX; x <= maxX; x++){
        if(x < 0) continue
        for(var y = minY; y <= maxY; y++){
            if(y < 0) continue
            if(arenaObj.positions[x] !== undefined){
                if(arenaObj.positions[x][y] !== undefined){
                    //Don't sense yourself
                    arenaObj.positions[x][y].forEach(function(o,i){
                        if(o.id !== self.id){
                            beingsSensed.push({pos:[x,y], being: arenaObj.positions[x][y]})
                        }
                    })
                    
                }
            }
        }
    }

    return beingsSensed
}


/*
Export Classes for Node 
*/
try{
    exports.Walker = Walker;
    exports.Seeker = Seeker;
    exports.Arena = Arena;
}
catch(err){

}

