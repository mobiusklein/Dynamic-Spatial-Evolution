# require Node modules for offline use
if modules?
  console.log "Running in Node Mode"
  _ = require('lodash')
  Random = require('random').Random
if !_?
  throw Error("Unable to find Lo-Dash")
if !Random?
  throw Error("Unable to find Random")

EntityClassRegistery = {}

mutationRate = 0.2
mutate = (heritableTraits, random) ->
  heritableTraits = _.cloneDeep(heritableTraits)
  didMutate = false
  for traitName of heritableTraits  
    if /strain/.test(traitName)
      continue
    probMutate = random.random()
    if probMutate <= mutationRate
      trait = heritableTraits[traitName]
      #console.log "Mutation: #{probMutate}"
      
      mod = random.gauss(trait.randMean)
      #console.log "Modifier: #{mod}"
      
      trait.currentValue += mod
      trait.currentValue = trait.cleanFunction(trait.currentValue)

      trait.currentValue = trait.minValue if trait.currentValue < trait.minValue
      trait.currentValue = trait.maxValue if trait.currentValue > trait.maxValue

      didMutate = true
#  if didMutate
#    heritableTraits.strain = "strain-#{++strainCount}"
  return heritableTraits


# ===============================================
#    Utilities
# ===============================================

cleanArray = (array) ->
  cleaned = []
  for i in array
    if i?
      cleaned.push i 
  return cleaned

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
    @blockades = []
    @periodics = []

    @save = argObj.save or false
    @verbose = argObj.verbose or false
    
    @positions = {}
    @history = []
    
    @random = new Random(if argObj.randomSeed? then argObj.randomSeed else 1)
  setPosition: (obj) ->
    obj.fillRegion(this)
  addWalker: (opts = {}, force = false) ->
    opts = @randomPositionWithin(opts, force)
    opts.random = @random
    walker = new Walker(opts)
    @walkers.push walker
    @setPosition(walker)
  addSeeker: (opts = {}, force = false) ->
    opts = @randomPositionWithin(opts, force)
    opts.random = @random
    seeker = new Seeker(opts)
    @actors.push seeker
    @setPosition(seeker)
  addPeriodicWalker: (opts, force = false) ->
    #opts = @randomPositionWithin(opts, force)
    opts.frequency = opts.frequency or 20
    fn = ()=>
      self.addWalker @randomPositionWithin(opts, force)
      return
    fn.frequency = opts.frequency
    self = this
    @periodics.push fn

  addObject: (obj, force = false) ->
    # If object is descended from the Seeker class
    obj.random = @random
    @randomPositionWithin(obj, force)
    if obj instanceof Seeker
      @actors.push obj
    
    else if obj instanceof Walker
      @walkers.push obj

    else if obj instanceof Blockade
      @blockades.push obj

    else 
      throw Error("Could not infer arena slot for #{obj}")
    
  randomPositionWithin: (opts = {}, force = false) ->
    # Adds a random position within the arena if the object does
    # not already have xy coordinates
    opts.x = @random.randint(0, @maxX) if(force or !opts.x?)
    opts.y = @random.randint(0, @maxY) if(force or !opts.y?)
    opts.x = Math.floor(opts.x)
    opts.y = Math.floor(opts.y)

    # Make sure you're not located in a Blockade
    if @positions[opts.x]? and @positions[opts.x][opts.y]? and @positions[opts.x][opts.y].some((entity) -> return entity.solid)
      opts = @randomPositionWithin(opts, true)

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

    for block in @blockades
      @setPosition(block)


    for walker in @walkers
      walker.step(this)
      @setPosition(walker)

    dead = []

    for actor in @actors
      dead = actor.step(this)
      for died in dead
        deceased[died.id] = true
      @setPosition(actor)

    survivors = []
    @walkers.forEach (obj, i) ->
      if !deceased[obj.id]?
        survivors.push obj
      else
        obj.state = "dead"
      return
    @walkers = survivors

    survivors = []
    for actor in @actors
      if !deceased[actor.id]?
        survivors.push actor
    @actors = survivors

    @periodics.forEach (func, i) ->
      func()  if self.ticker % func.frequency is 0
      return

    return
EntityClassRegistery["Arena"] = Arena
# ===============================================
#    Blockade
#    Defines an object which prevents movement through it
# =============================================== 

class Blockade
  @COUNT: 0
  constructor: (argObj) ->
    @id = "blockade-" + Blockade.COUNT
    
    @x = argObj.x
    @y = argObj.y
    
    @width = argObj.width
    @height = argObj.height
    
    @solid = true

    @state = ""
    Blockade.COUNT++

  fillRegion: (boundsObj) ->
    minX = @x - @width
    minY = @y - @height
    minX = if minX >= 0 then minX else 0
    minY = if minY >= 0 then minY else 0

    maxX = @x + @width
    maxY = @y + @height

    maxX = if maxX > @maxX then @maxX else maxX
    maxY = if maxY > @maxY then @maxY else maxY

    xAxisRange = (x for x in [minX..maxX])
    yAxisRange = (y for y in [minY..maxY])

    # Fill space around the position of this object
    for x in xAxisRange
      for y in yAxisRange
        boundsObj.positions[x] = {} if !boundsObj.positions[x]?
        boundsObj.positions[x][y] = []  if !boundsObj.positions[x][y]?
        boundsObj.positions[x][y].push this
EntityClassRegistery["Blockade"] = Blockade


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
    @stepStartHook = if argObj.stepStartHook? then argObj.stepStartHook else []
    @preMoveHook = if argObj.preMoveHook? then argObj.preMoveHook else []
    @postMoveHook = if argObj.postMoveHook? then argObj.postMoveHook else []
    @stepEndHook = if argObj.stepEndHook? then argObj.stepEndHook else []

    @postMoveHook.push(@unstuck)


  # Handle Event Hooks Functions
  stepStart: (boundsObj) ->
    for fn in @stepStartHook
      fn.apply(this, [boundsObj])
  preMove: (boundsObj) ->
    for fn in @preMoveHook
      fn.apply(this, [boundsObj])
  postMove: (boundsObj) ->
    for fn in @postMoveHook
      fn.apply(this, [boundsObj])
  stepEnd: (boundsObj) ->
    for fn in @stepEndHook
      fn.apply(this, [boundsObj])

  unstuck: (boundsObj) ->
    if boundsObj.positions[@x]? and boundsObj.positions[@x][@y]? and boundsObj.positions[@x][@y].some((obj) -> return obj instanceof Blockade)
      console.log "Unstuck! #{@id}"
      boundsObj.randomPositionWithin(this, true)


  onEaten: (eater) ->
    eater.totalFood += @value

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

  fillRegion: (boundsObj) ->
    minX = @x - @size
    minY = @y - @size
    minX = if minX >= 0 then minX else 0
    minY = if minY >= 0 then minY else 0

    maxX = @x + @size
    maxY = @y + @size

    maxX = if maxX > @maxX then @maxX else maxX
    maxY = if maxY > @maxY then @maxY else maxY

    xAxisRange = (x for x in [minX..maxX])
    yAxisRange = (y for y in [minY..maxY])

    # Fill space around the position of this object
    for x in xAxisRange
      for y in yAxisRange
        boundsObj.positions[x] = {} if !boundsObj.positions[x]?
        boundsObj.positions[x][y] = []  if !boundsObj.positions[x][y]?
        boundsObj.positions[x][y].push this
EntityClassRegistery["Walker"] = Walker
# ===============================================
#    Seeker
#    Defines an object which traverses the arena in tumbles and runs
# =============================================== 

# A collection of two dimensional direction vectors
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
  @heritableTraits: {
    stepSize: {
      baseValue: 5,
      currentValue: 5,
      minValue: 1,
      maxValue: 100,
      cleanFunction: Math.round,
    }
  }
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
    
    @heritableTraits = if !argObj.heritableTraits? then _.cloneDeep(Seeker.heritableTraits) else argObj.heritableTraits

    # Apply Seeker's defaults in place of Walker defaults
    @size = (if !argObj.size? then 5 else argObj.size)
    @stepSize = (if !argObj.stepSize? then 5 else argObj.stepSize)
    @totalFood = argObj.startingFood or 75
    @minimumReplicationFoodThreshold = argObj.minimumReplicationFoodThreshold or 300
    @BMR = argObj.BMR or (optsObj) -> @totalFood -= @stepSize/1000
    @minimumReplicationDelay = argObj.minimumReplicationDelay or 10
    @eaten = 0
    @lastEaten = [0,0,0]
    Seeker.SEEKER_COUNT += 1

    @inherit()

  step: (boundsObj) ->
    # Increase Age
    @age += 1
    @stepStart(boundsObj)
    @BMR()

    # Tumble and change facing
    diffEaten = (@eaten - @lastEaten[0]) > (@lastEaten[0] - @lastEaten[1])
    tumbleProb = (if diffEaten then @tumbleFrequency[0] else @tumbleFrequency[1])
    actionChoice = @random.random()
    if actionChoice < tumbleProb
      # Force selection of new facing
      newFacing = @facing
      @facing = @random.choice(FACINGS) while @facing is newFacing
    
    @lastEaten.unshift(@eaten)
    @lastEaten.pop() if @lastEaten.length > 2
    @eaten = 0

    # Sense Beings
    closeThings = @sense(boundsObj)
    remove = []
    for close in closeThings
      for o in close
        if (o.type in @canEat) and not o.mark
          o.onEaten(this)
          @eaten += 1
          o.mark = true
          remove.push o
          if @totalFood > @minimumReplicationFoodThreshold and @age > @minimumReplicationDelay
            @replicate boundsObj
            remove.push(this)
            return remove
    
    @preMove(boundsObj)

    # Compute step magnitude and apply facing direction
    newX = @stepSize * @facing[0]
    newY = @stepSize * @facing[1]

    [newX, newY] = boundsObj.pathClear(this, {x:newX, y:newY})
    
    @x += newX
    @y += newY
    @within boundsObj
    
    @postMove(boundsObj)

    if @totalFood < 0
      @mark = true
      remove.push this
    else if @totalFood > @minimumReplicationFoodThreshold and @age > @minimumReplicationDelay
        @replicate boundsObj
        @mark = true
        remove.push(this)
        return remove
    else if @totalFood < 50
      @state = "starving"
    else
      @state = ""

    @stepEnd(boundsObj)
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
    traits = this
    traits.heritableTraits = mutate(this.heritableTraits, @random)
    boundsObj.addSeeker traits
    traits.heritableTraits = mutate(this.heritableTraits, @random)
    boundsObj.addSeeker traits
    return

  inherit: () ->
    for traitName of @heritableTraits
      this[traitName] = @heritableTraits[traitName].currentValue
EntityClassRegistery["Seeker"] = Seeker
# ===============================================
#    Siderophore
#    Defines an object descending from Walker which is not edible,
#    but after some time delay becomes edible. 
# =============================================== 

class Siderophore extends Walker
  @maturationTime: 30
  @matureValue: 6
  constructor: (argObj) ->
    argObj.stepStartHook = [] if !argObj.stepStartHook?
    argObj.stepStartHook.push((paramObj) -> @react() if @age > Siderophore.maturationTime and !@reacted)
    argObj.type = 'siderophore'
    argObj.value = 0
    argObj.size = 2
    super argObj
    @reacted = false
    @spawnedBy =argObj.spawnedBy

  react: ->
    @reacted = true
    @type = 'bound-siderophore'
    @value = Siderophore.matureValue
EntityClassRegistery["Siderophore"] = Siderophore

class SiderophoreProducer extends Seeker
  @siderophoreCost: 3
  @siderophoreProductionRate: 30
  @COUNT: 0
  @heritableTraits: {
    stepSize: {
      baseValue: 5,
      currentValue: 5,
      minValue: 1,
      maxValue: 100,
      cleanFunction: Math.round,
    },
    siderophoreProductionRate: {
      baseValue: 30,
      currentValue: 30,
      minValue: 1,
      maxValue: 100,
      cleanFunction: Math.round,
    }
  }
  constructor: (argObj) ->
    argObj.canEat = [] if !argObj.canEat?
    argObj.canEat.push 'bound-siderophore'
    argObj.canEat.push 'glucose'
    argObj.type = 'siderophore-producer'
    argObj.heritableTraits = if !argObj.heritableTraits? then _.cloneDeep(SiderophoreProducer.heritableTraits) else argObj.heritableTraits
    argObj.stepStartHook = [] if !argObj.stepStartHook?
    argObj.stepStartHook.push ((paramObj) => 
      if @age % @siderophoreProductionRate == 0
        @produceSiderophore(paramObj)
      )
    super argObj    
    @id = "siderophore-producer-" + SiderophoreProducer.COUNT++
    


  produceSiderophore: (boundsObj) ->
    @totalFood -= SiderophoreProducer.siderophoreCost
    pos = {x: @x, y: @y, spawnedBy: @id}
    siderophore = new Siderophore(pos)
    boundsObj.addObject(siderophore)

  replicate: (boundsObj) ->
    traits = this
    traits.heritableTraits = mutate(this.heritableTraits, @random)
    daughterA = new SiderophoreProducer(traits)
    traits.heritableTraits = mutate(this.heritableTraits, @random)
    daughterB = new SiderophoreProducer(traits)
    boundsObj.addObject(daughterA)
    boundsObj.addObject(daughterB)
    @mark = true
    return

#
#Export Classes for Node 
#
try
  exports.Walker = Walker
  exports.Seeker = Seeker
  exports.Arena = Arena
  exports.Utils = {}