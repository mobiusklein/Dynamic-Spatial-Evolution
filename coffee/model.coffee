# require Node modules for offline use
if modules?
  console.log "Running in Node Mode"
  _ = require('lodash')
  Random = require('random').Random
if !_?
  throw Error("Unable to find Lo-Dash")
if !Random?
  throw Error("Unable to find Random")


# ===============================================
#    Utilities
# ===============================================

# Create a deep copy of obj. Does not work on nested objects. Uses
# JSON serialization to break all bindings.
#
# Not suitable for copying any object that contains an instance of 
# Random, as it will break the random seeding consistency.
copy = (obj) ->
  duplicate = JSON.parse(JSON.stringify(obj))
  return duplicate

# ===============================================
#    Arena
#    Defines an object which describes an area which actors
#    and walkers move within. 
# =============================================== 
class Arena
  constructor: (argObj) ->
    @minX = argObj.minX
    @maxX = argObj.maxX
    @minY = argObj.minY
    @maxY = argObj.maxY
    @ticker = 0
    @creationQueue = []
    @actors = []
    @walkers = []
    @periodics = []
    @save = argObj.save or false
    @verbose = argObj.verbose or false
    @positions = {}
    @history = []
    @random = new Random(if argObj.randomSeed? then argObj.randomSeed else 1)
  setPosition: (obj) ->
    @fillRegionWithPolygon obj
  addWalker: (opts = {}) ->
    opts = @randomPositionWithin(opts)
    opts.random = @random
    walker = new Walker(opts)
    @walkers.push walker
    @setPosition(walker)
  addSeeker: (opts = {}) ->
    opts = @randomPositionWithin(opts)
    opts.random = @random
    seeker = new Seeker(opts)
    @actors.push seeker
    @setPosition(seeker)
  addPeriodicWalker: (opts) ->
    opts = @randomPositionWithin(opts)
    opts.frequency = opts.frequency or 20
    fn = ->
      self.addWalker opts
      return
    fn.frequency = opts.frequency
    self = this
    @periodics.push fn


  addObject: (obj) ->
    # If object is descended from the Seeker class
    obj.random = @random
    if obj instanceof Seeker
      @actors.push obj

    # Default
    else
      @walkers.push obj
    
  #
  #    Container is an object such as an Arena's .positions sparse
  #    matrix. 
  #
  fillRegionWithPolygon: (polygonObj) ->
    #
    #    SIZE positions on either side of the origin point  
    #
    minX = polygonObj.x - polygonObj.size
    minY = polygonObj.y - polygonObj.size
    minX = if minX >= 0 then minX else 0
    minY = if minY >= 0 then minY else 0

    maxX = polygonObj.x + polygonObj.size
    maxY = polygonObj.y + polygonObj.size

    maxX = if maxX > @maxX then @maxX else maxX
    maxY = if maxY > @maxY then @maxY else maxY

    xAxisRange = (x for x in [minX..maxX])
    yAxisRange = (y for y in [minY..maxY])

    # Fill space around the position of the polygonObj
    for x in xAxisRange
      for y in yAxisRange
        @positions[x] = {} if !@positions[x]?
        @positions[x][y] = []  if !@positions[x][y]?
        @positions[x][y].push polygonObj

    @positions

  randomPositionWithin: (opts = {}) ->
    opts.x = Math.floor(opts.x) or @random.randint(0, @maxX)
    opts.y = Math.floor(opts.y) or @random.randint(0, @maxY)
    return opts

  pathClear: (obj, newPos) ->
    lastX = obj.x
    for x in [obj.x..(obj.x + newPos.x)]
      @positions[x] = {} if !@positions[x]?
      lastY = obj.y
      for y in [obj.y..(obj.y + newPos.y)]
        @positions[x][y] = [] if !@positions[x][y]?
        solid = @positions[x][y].some((i)-> return i.solid)
        if(solid)
          # Adjust the new coordinates to be in terms of change from the original position
          return [lastX - obj.x, lastY - obj.y]
        lastY = y
      lastX = x
    # Didn't encounter any solid objects along the path
    return [newPos.x, newPos.y]
  tick: ->
    @history.push @positions  if @save
    @ticker += 1
    @positions = {}
    deceased = {}
    self = this

    @walkers.forEach (obj, i) ->
      obj.step self
      self.setPosition obj
      return

    dead = []

    @actors.forEach (obj, i) ->
      dead = (obj.step(self))
      dead.forEach (o) ->
        deceased[o.id] = true
        return

      self.setPosition obj
      return

    survivors = []
    @walkers.forEach (obj, i) ->
      if !deceased[obj.id]?
        survivors.push obj
      else
        obj.state = "dead"
      return
    @walkers = survivors


    survivors = []
    @actors.forEach (obj, i) ->
      if deceased[obj.id] is `undefined`
        survivors.push obj
      else
        obj.state = "dead"
      return
    @actors = survivors

    @periodics.forEach (func, i) ->
      func()  if self.ticker % func.frequency is 0
      return

    return

# ===============================================
#    Walker
#    Defines an object which traverses the arena in a random walk. 
# =============================================== 
class Walker
  @WALKER_COUNT: 0
  constructor: (argObj) ->
    # Ensure that each Walker has a unique identifier
    @id = "walker-" + Walker.WALKER_COUNT
    @x = argObj.x
    @y = argObj.y
    @size = (if argObj.size? then argObj.size else 1)
    @stepSize = (if argObj.stepSize? then argObj.stepSize else 1)
    @state = argObj.state

    # String declaring the type of entity.
    @type = argObj.type

    # This entity can be passed through
    @solid = false
    
    # The metabolic value of consuming this
    @value = if argObj.value? then argObj.value else 1

    # Number of time steps since this entity was born
    @age = 0

    # This entity has not been marked yet, so it can be interacted with
    @mark = false

    # Increment count of Walker instances
    Walker.WALKER_COUNT += 1

    @random = if argObj.random then argObj.random else new Random(1)

    # Attach synchronous event hooks
    @stepStartHook = if argObj.stepStart? then argObj.stepStart else []
    @preMoveHook = if argObj.preMove? then argObj.preMove else []
    @postMoveHook = if argObj.postMove? then argObj.postMove else []
    @stepEndHook = if argObj.stepEndHook? then argObj.stepEndHook else []


  # Handle Event Hooks Functions
  stepStart: (boundsObj) ->
    for fn in @stepStartHook
      fn.apply(this, boundsObj)
  preMove: (boundsObj) ->
    for fn in @preMoveHook
      fn.apply(this, boundsObj)
  postMove: (boundsObj) ->
    for fn in @postMoveHook
      fn.apply(this, boundsObj)
  stepEnd: (boundsObj) ->
    for fn in @stepEndHook
      fn.apply(this, boundsObj)

  step: (boundsObj) ->
    # Increase Age
    @age += 1
    @stepStart(boundsObj)

    @preMove(boundsObj)
    # Compute new trajectory
    newX = @random.randint(-@stepSize, @stepSize)
    newY = @random.randint(-@stepSize, @stepSize)
    # Travel as far as possible along trajectory
    [newX, newY] = boundsObj.pathClear(this, {x:newX, y:newY})
    # Update Position
    @x += newX
    @y += newY

    # Verify Position within Bounds
    @within boundsObj
    @postMove(boundsObj)

    @stepEnd(boundsObj)

    

  within: (boundsObj, escape = true) ->
    if @x <= boundsObj.minX
      @x += @stepSize * 1 + @size  if escape
    else @x -= @stepSize * 1 + @size  if escape  if @x >= boundsObj.maxX
    if @y <= boundsObj.minY
      @y += @stepSize * 1 + @size  if escape
    else @y -= @stepSize * 1 + @size  if escape  if @y >= boundsObj.maxY
    return

# ===============================================
#    Seeker
#    Defines an object which traverses the arena in tumbles and runs
# =============================================== 
FACINGS = [
  [0, 1],
  [1, 0],
  [0,-1],
  [-1,0],
  [1,1],
  [1,-1],
  [-1,1],
  [-1,-1]
]

class Seeker extends Walker
  @SEEKER_COUNT: 0
  constructor: (argObj) ->
    super argObj
    # Override the Walker ID
    @id = "seeker-" + Seeker.SEEKER_COUNT
    @canEat = if argObj.canEat? then argObj.canEat else ['food']
    @solid = true
    
    # Movement
    # Seekers have a facing in addition to Walker's .x and .y fields
    @facing = (if !argObj.facing? then [1,1] else argObj.facing)
    
    # A pair of the form [Recent Fed, No Recent Fed]
    @tumbleFrequency = argObj.tumbleFrequency or [
      0.01
      0.1
    ]
    
    @heritableTraits = copy(argObj.heritableTraits)

    # Apply Seeker's defaults in place of Walker defaults
    @size = (if !argObj.size? then 5 else argObj.size)
    @stepSize = (if !argObj.stepSize? then 5 else argObj.stepSize)
    @totalFood = 100
    @minimumReplicationFoodThreshold = argObj.minimumReplicationFoodThreshold or 500
    @BMR = argObj.BMR or (optsObj) -> @totalFood -= @stepSize/1000
    @minimumReplicationDelay = argObj.minimumReplicationDelay or 10
    @eaten = 0
    @lastEaten = [0,0,0,0]
    Seeker.SEEKER_COUNT += 1

  step: (boundsObj) ->
    @BMR()
    self = this
    @eaten = 0
    tumbleProb = (if @eaten > 1 then @tumbleFrequency[0] else @tumbleFrequency[1])
    actionChoice = @random.random()
    
    # Tumble and change facing
    if actionChoice < tumbleProb
      # Force selection of new facing
      newFacing = @facing
      @facing = @random.choice(FACINGS) while @facing is newFacing
    
    # Sense Beings
    closeThings = @sense(boundsObj)
    remove = []
    for close in closeThings
      for o in close
        if (o.type in @canEat) and not o.mark
          @totalFood += o.value
          @eaten += 1
          o.mark = true
          remove.push o
          if @totalFood > @minimumReplicationFoodThreshold and @age > @minimumReplicationDelay
            @replicate boundsObj
            remove.push(this)
            return remove
    
    # Compute step magnitude and apply facing direction
    newX = @stepSize * @facing[0]
    newY = @stepSize * @facing[1]

    [newX, newY] = boundsObj.pathClear(self, {x:newX, y:newY})
    
    @x += newX
    @y += newY
    @age += 1
    @within boundsObj
    if @totalFood < 0
      @mark = true
      remove.push this
    
    if @totalFood < 50
      @state = "starving"
    else
      @state = ""

    return remove

  within: (boundsObj, escape = true) ->
    # As the Walker implementation, but also reverse the facing along
    # the impinging axis
    corrected = false
    if @x <= boundsObj.minX
      corrected = true
      if escape
        @x += @stepSize * 1
        @facing[0] *= -1
    else if @x >= boundsObj.maxX
      corrected = true
      if escape
        @x -= @stepSize * 1
        @facing[0] *= -1
    if @y <= boundsObj.minY
      corrected = true
      if escape
        @y += @stepSize * 1
        @facing[1] *= -1
    else if @y >= boundsObj.maxY
      corrected = true
      if escape
        @facing[1] *= -1
        @y -= @stepSize * 1
    return

  sense: (arenaObj) ->
    midX = @x
    midY = @y
    maxX = midX + (@size + 1)
    maxY = midY + (@size + 1)
    minX = midX - (@size + 1)
    minY = midY - (@size + 1)
    beingsSensed = []
    self = this
    
    # Scan the surrounding space
    for x in [minX..maxX]
      continue  if x < 0
      continue if x > arenaObj.maxX

      for y in [minY..maxY]
        continue  if y < 0
        continue if y > arenaObj.maxY
        if arenaObj.positions[x]?
          if arenaObj.positions[x][y]?
            
            for other in arenaObj.positions[x][y]
              #Don't sense yourself
              if other.id != @id
                beingsSensed.push arenaObj.positions[x][y]

    #console.log beingsSensed  if beingsSensed.length > 1
    return beingsSensed

  death: (boundsObj) ->
    console.log(@id + " died");
    @mark = true

  replicate: (boundsObj) ->
    @mark = true
    boundsObj.addSeeker this
    boundsObj.addSeeker this
    return

# ===============================================
#    Siderophore
#    Defines an object descending from Walker which is not edible,
#    but after some time delay becomes edible. 
# =============================================== 

class Siderophore extends Walker
  constructor: (argObj) ->
    argObj.stepStart = [] if !argObj.stepStart?
    argObj.stepStart.push((paramObj) -> @react() if @age > 50)
    argObj.type = 'siderophore'
    argObj.value = 0
    super argObj

  react: ->
    @type = 'bound-siderophore'
    @value = 6

class IronConsumer extends Seeker
  @siderophoreCost: 3
  constructor: (argObj) ->
    argObj.canEat = [] if !argObj.canEat?
    argObj.canEat.push 'bound-siderophore'
    argObj.stepStart = [] if !argObj.stepStart?

  produceSiderophore: (boundsObj) ->
    @totalFood -= IronConsumer.siderophoreCost
    

#
#Export Classes for Node 
#
try
  exports.Walker = Walker
  exports.Seeker = Seeker
  exports.Arena = Arena
  exports.Utils = {fillRegionWithPolygon: fillRegionWithPolygon, copy: copy}