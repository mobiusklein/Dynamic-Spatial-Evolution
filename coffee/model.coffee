# require Node modules for offline use
if module?
  console.log "Running in Node Mode"
  _ = require('lodash')
  ss = require("simple-statistics")
  ss.mixin()
  Random = require('random-js').Random

# Validate that dependencies are available.
if !_?
  throw Error("Unable to find lodash")
if !Random?
  throw Error("Unable to find random")
if !ss?
  throw Error("Unable to find simple-statistics")

# ===============================================
#    Global Application Functions
# ===============================================

# A name-to-class mapping for use in future serialization solutions
EntityClassRegistery = {}

# A phylogenetic tree structure for storing strain branching.
StrainTree = {'strain-0':[]}

# The global trait mutation rate. Value should be made a parameter.
mutationRate = 0.2

# 
mutate = (heritableTraitsBase, random) ->
  heritableTraits = _.cloneDeep(heritableTraitsBase)
  didMutate = false
  for traitName of heritableTraits  
    # Ignore the strain trait
    if /strain/.test(traitName)
      continue
    probMutate = random.random()
    # Genome always mutates
    if traitName == 'genome'
      probMutate = 0
    if probMutate <= mutationRate
      trait = heritableTraits[traitName]
      
      trait.mutateFunction(trait, random)
      trait.currentValue = trait.cleanFunction(trait.currentValue)

      trait.currentValue = trait.minValue if trait.currentValue < trait.minValue
      trait.currentValue = trait.maxValue if trait.currentValue > trait.maxValue

      # A change in traits means we should describe a new strain. Doesn't count for the genome.
      didMutate = true if traitName != "genome"
  if didMutate
    parentStrain = heritableTraits.strain.currentValue
    heritableTraits.strain.currentValue = _.uniqueId("strain-")
    StrainTree[parentStrain].push heritableTraits.strain.currentValue
    StrainTree[heritableTraits.strain.currentValue] = []
  return heritableTraits

extendHeritable = (classType, newTraits) ->
  traitsCopy = _.cloneDeep(classType.heritableTraits)
  traitsCopy = _.extend(traitsCopy, _.cloneDeep(newTraits))
  return traitsCopy

generateRandomGenome = (length) ->
  rng = new Random()
  genome = []
  for i in [0...length]
    genome.push(rng.choice([true, false]))
  return genome

alleleFrequency = (genomeSet) ->
  frequencies = []
  for ind in [0...genomeSet[0].length]
    freq = [0, 0]
    for genome in genomeSet
      if genome[ind]
        freq[0]++
      else 
          freq[1]++
    freq = ((q/genomeSet[0].length) for q in freq)
    frequencies.push freq
  return frequencies

tajimaD = (genomeSet) ->
  frequencies = alleleFrequency(genomeSet)
  numSegSites = genomeSet[0].length
  sampleSize = genomeSet.length
  sum = 0
  for locus in frequencies
    # Make sure site is segregating
    if locus.some((g) -> return g.length == genomeSet[0].length)
      numSegSites--
      continue 
    [p, q] = locus
    sum += p*q
  piEstimate = sum * sampleSize / (sampleSize-1)
  a1 = (1/i for i in [1...sampleSize]).sum()
  #console.log "a1 = #{a1}" if verbose
  a2 = (1/(i**2) for i in [1...sampleSize]).sum()
  #console.log "a2 = #{a2}" if verbose
  b1 = (sampleSize + 1)/(3 * (sampleSize - 1))
  #console.log "b1 = #{b1}" if verbose
  b2 = (2 * ((sampleSize**2) + sampleSize + 3))/(9*sampleSize*(sampleSize - 1))
  #console.log "b2 = #{b2}" if verbose
  c1 = b1 - (1/a1)
  #console.log "c1 = #{c1}" if verbose
  c2 = b2 - ((sampleSize + 2)/(a1 * sampleSize)) + (a2/(a1**2))
  #console.log "c2 = #{c2}" if verbose
  e1 = c1/a1
  e2 = c2/((a1**2) + a2)
  numerator = piEstimate - (numSegSites / a1)
  console.log("pi Estimate: #{piEstimate}, numSegSites: #{numSegSites}")
  denominator = (e1 * numSegSites + (e2 * numSegSites * (numSegSites - 1))) ** 0.5
  D = numerator/denominator
  return D

# ===============================================
#    Utilities
# ===============================================

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
    @fixtures = []
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
    fn = () ->
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
    if @positions[opts.x]? and @positions[opts.x][opts.y]? and @positions[opts.x][opts.y].some((entity) -> return entity.isBlockade)
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

    for fixture in @fixtures
      expired = fixture.step(this)
      for ex in expired
        deceased[ex.id] = true
      @setPosition(fixture)

    survivors = []
    for fixture in @fixtures
      if fixture.id not in deceased
        survivors.push fixture
    @fixtures = survivors
    deceased = {}

    for walker in @walkers
      walker.step(this)
      @setPosition(walker)

    for actor in @actors
      dead = actor.step(this)
      for died in dead
        deceased[died.id] = true
      @setPosition(actor)

    survivors = []
    @walkers.forEach (obj, i) ->
      if !deceased[obj.id]?
        survivors.push obj
      return
    @walkers = survivors

    survivors = []
    for actor in @actors
      if !deceased[actor.id]?
        survivors.push actor
    @actors = survivors

    @periodics.forEach (func, i) ->
      func.apply(self, null)  if self.ticker % func.frequency is 0
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

    #Predicates
    @isBlockade = true
    @isWalker = false

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
#    Fixture
#    Defines an immobile region that has periodic behavior.
# =============================================== 

class Fixture
  @COUNT: 0
  constructor: (argObj) ->
    @id = 'fixture-' + Fixture.COUNT++
    @x = argObj.x
    @y = argObj.y

    @width = argObj.width
    @height = argObj.height
    
    @age = 0

    @solid = false

    #Predicates
    @isBlockade = false
    @isWalker = false
    @isFixture = true

    @random = if argObj.random then argObj.random else new Random(1)
    @mark = false

    @actions = if argObj.actions? then argObj.actions else {}

  doActions: (boundsObj) ->
    for fnName of @actions
      fn = @actions[fnName]
      fn.apply(this, [boundsObj])

  step: (argObj) ->
    @age++
    @doActions()

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

EntityClassRegistery["Fixture"] = Fixture
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

    # Type predicates
    @isBlockade = false
    @isWalker = true

    # This entity has not been marked yet, so it can be interacted with
    @mark = false

    # Increment count of Walker instances
    Walker.WALKER_COUNT += 1

    @random = if argObj.random then argObj.random else new Random(1)

    # Attach synchronous event hooks
    @stepStartHook = if argObj.stepStartHook? then argObj.stepStartHook else {}
    @preMoveHook = if argObj.preMoveHook? then argObj.preMoveHook else {}
    @postMoveHook = if argObj.postMoveHook? then argObj.postMoveHook else {}
    @stepEndHook = if argObj.stepEndHook? then argObj.stepEndHook else {}

    @postMoveHook["unstuck"] = @unstuck


  # Handle Event Hooks Functions
  stepStart: (boundsObj) ->
    for fnName of @stepStartHook
      fn = @stepStartHook[fnName]
      fn.apply(this, [boundsObj])
  
  preMove: (boundsObj) ->
    for fnName of @preMoveHook
      fn = @preMoveHook[fnName]
      fn.apply(this, [boundsObj])  

  postMove: (boundsObj) ->
    for fnName of @postMoveHook
      fn = @postMoveHook[fnName]
      fn.apply(this, [boundsObj])

  stepEnd: (boundsObj) ->
    for fnName of @stepEndHook
      fn = @stepEndHook[fnName]
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
  [0, -1],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1]
]

class Seeker extends Walker
  @SEEKER_COUNT: 0
  @baseGenome: generateRandomGenome(100)
  @heritableTraits: {
    stepSize: {
      baseValue: 5,
      currentValue: 5,
      minValue: 1,
      maxValue: 100,
      gaussMean: -0.8,
      gaussVariance: 3,
      mutateFunction: (trait, random) ->
        mod = random.gauss(trait.gaussMean, trait.gaussVariance)
        trait.currentValue += mod
      cleanFunction: Math.round,
    }
    genome: {
      baseValue: @baseGenome
      currentValue: @baseGenome
      perBaseMutationRate: 0.0001
      mutateFunction: (trait, random) ->
        numMutatedIndices = trait.currentValue.length * trait.perBaseMutationRate
        mutatedIndices = random.sample((i for i in [0..trait.currentValue.length]), numMutatedIndices)
        for i in mutatedIndices
          trait.currentValue[i] = not trait.currentValue[i]
      cleanFunction: (g) -> return g
    }
    strain:{
      currentValue: "strain-0"
    }
  }
  constructor: (argObj) ->
    super argObj
    # Override the Walker ID
    @id = "seeker-" + Seeker.SEEKER_COUNT
    #
    # TODO Switch to Object from Array to specify type-specific eating behavior
    #
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
    @BMR = argObj.BMR or (optsObj) -> @totalFood -= (@stepSize + (@stepSize - @heritableTraits.stepSize.baseValue))/1000
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
    argObj.stepStartHook = {} if !argObj.stepStartHook?
    argObj.stepStartHook["react"] = ((paramObj) -> @react() if @age > Siderophore.maturationTime and !@reacted)
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
  @heritableTraits: extendHeritable(Seeker,{
    siderophoreProductionRate: {
      baseValue: 30,
      currentValue: 30,
      minValue: 10,
      maxValue: 100,
      gaussMean: 1.2
      gaussVariance: 3
      mutateFunction: (trait, random) ->
        mod = random.gauss(trait.gaussMean, trait.gaussVariance)
        trait.currentValue += mod
      cleanFunction: Math.round,
    }
  })
  constructor: (argObj) ->
    argObj.canEat = [] if !argObj.canEat?
    argObj.canEat.push 'bound-siderophore' if !('bound-siderophore' in argObj.canEat)
    argObj.canEat.push 'glucose' if !('glucose' in argObj.canEat)
    argObj.type = 'siderophore-producer'
    argObj.heritableTraits = if !argObj.heritableTraits? then _.cloneDeep(SiderophoreProducer.heritableTraits) else argObj.heritableTraits
    argObj.stepStartHook = {} if !argObj.stepStartHook?
    argObj.stepStartHook['produceSiderophore'] = ((paramObj) -> 
      if (@age % @siderophoreProductionRate == 0) and (@totalFood > 50)
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
  exports.Arena = Arena
  exports.Blockade = Blockade
  exports.Walker = Walker
  exports.Seeker = Seeker
  exports.Siderophore = Siderophore
  exports.SiderophoreProducer = SiderophoreProducer
  exports.EntityClassRegistery = EntityClassRegistery
  exports.StrainTree = StrainTree
  exports.mutate = mutate
  exports.Utils = {}