# require Node modules for offline use

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
  setPosition: (obj) ->
    @fillRegionWithPolygon obj
  addWalker: (opts) ->
    opts = (if opts is `undefined` then {} else opts)
    opts = @randomPositionWithin(opts)
    walker = new Walker(opts)
    @walkers.push walker
    @setPosition(walker)
  addSeeker: (opts = {}) ->
    opts = @randomPositionWithin(opts)
    seeker = new Seeker(opts)
    @actors.push seeker
    @setPosition(seeker)
  addPeriodicWalker: (opts) ->
    opts = @randomPositionWithin(opts)
    opts.frequency = opts.frequency or 20
    f = ->
      self.addWalker opts
      return

    f.frequency = opts.frequency
    self = this
    @periodics.push f
  #
  #    Container is an object such as an Arena's .positions sparse
  #    matrix. 
  #
  fillRegionWithPolygon: (polygonObj) ->
    #
    #    SIZE positions on either side of the origin point  
    #
    #console.log "Fill Start"
    minX = polygonObj.x - polygonObj.size
    minY = polygonObj.y - polygonObj.size
    #throw RangeError("Not within container")  if minX < 0 or minY < 0
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

    #console.log "Fill End"
    @positions

  randomPositionWithin: (opts) ->
    opts = (if opts is `undefined` then {} else opts)
    opts.x = Math.floor(opts.x) or Math.floor(Math.random() * @maxX)
    opts.y = Math.floor(opts.y) or Math.floor(Math.random() * @maxY)
    opts

  pathClear: (obj, newPos) ->
    console.log(obj)
    #console.log("Current Pos", obj.x. obj.y);
    console.log("New Pos", newPos.x, newPos.y)
    for x in [obj.x..(obj.x + newPos.x)]
       @positions[x] = {} if !@positions[x]?
      for y in [obj.y..(obj.y + newPos.y)]
        @positions[x][y] = [] if !@positions[x][y]?
        solid = @positions[x][y].some((i)-> return i.solid)
        if(solid)
          return [x - obj.x, y - obj.y]

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
      if deceased[obj.id] is `undefined`
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
  constructor: (argObj) ->
    @id = "walker-" + Walker.WALKER_COUNT
    @x = argObj.x
    @y = argObj.y
    @size = (if argObj.size is `undefined` then 5 else argObj.size)
    @stepSize = (if argObj.stepSize is `undefined` then 1 else argObj.stepSize)
    @state = argObj.state
    @type = argObj.type
    @edible = true
    @solid = false
    @age = 0
    @mark = false
    Walker.WALKER_COUNT += 1

  @WALKER_COUNT: 0
  step: (boundsObj) ->
    newX = Walker.random(@stepSize)
    newY = Walker.random(@stepSize)
    @x += newX
    @y += newY
    @age += 1
    @within boundsObj

  within: (boundsObj, escape) ->
    escape = (if escape is `undefined` then true else escape)
    if @x <= boundsObj.minX
      @x += @stepSize * 1 + @size  if escape
    else @x -= @stepSize * 1 + @size  if escape  if @x >= boundsObj.maxX
    if @y <= boundsObj.minY
      @y += @stepSize * 1 + @size  if escape
    else @y -= @stepSize * 1 + @size  if escape  if @y >= boundsObj.maxY
    return

  # 
  #Generate symmetric random number between @stepSize and -@stepSize
  #
  @random: (stepSize) ->
    value = Math.floor(Math.random() * (stepSize * 2 + 1) - stepSize)
    return value


# ===============================================
#    Seeker
#    Defines an object which traverses the arena in tumbles and runs
#   =============================================== 
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
    #Override the Walker ID
    @id = "seeker-" + Seeker.SEEKER_COUNT
    @edible = false
    @solid = true
    
    #Movement
    #Seekers have a facing in addition to Walker's .x and .y fields
    @facing = (if argObj.facing is `undefined` then [
      1
      1
    ] else argObj.facing)
    
    #A pair of the form [Recent Fed, No Recent Fed]
    @tumbleFrequency = argObj.tumbleFrequency or [
      0.01
      0.1
    ]
    
    #Apply Seeker's defaults in place of Walker defaults
    @size = (if argObj.size is `undefined` then 5 else argObj.size)
    @stepSize = (if argObj.stepSize is `undefined` then 2 else argObj.stepSize)
    @totalFood = 100
    @minimumReplicationFoodThreshold = argObj.minimumReplicationFoodThreshold or 500
    @BMR = argObj.BMR or 0.01
    @minimumReplicationDelay = argObj.minimumReplicationDelay or 10
    @eaten = 0
    @lastEaten = [0,0,0,0]
    Seeker.SEEKER_COUNT += 1

  step: (boundsObj) ->
    @totalFood -= @BMR
    if @totalFood > @minimumReplicationFoodThreshold and @age > @minimumReplicationDelay
      @replicate boundsObj
      return [this]
    else if @totalFood < 50
      @state = "starving"
    else
      @state = ""
    self = this
    @eaten = 0
    tumbleProb = (if @eaten > 1 then @tumbleFrequency[0] else @tumbleFrequency[1])
    actionChoice = Math.random()
    
    #Tumble and change facing
    if actionChoice < tumbleProb
      newFacing = @facing
      @facing = FACINGS[Math.floor(Math.random() * FACINGS.length)]  while @facing is newFacing
    
    #Sense Beings
    closeThings = @sense(boundsObj)
    edibles = []
    closeThings.forEach (close) ->
      close.being.forEach (o) ->
        
        # Need to determine if thing is close enough to eat 
        # or adjust facing to chase
        if o.edible
          
          #Not quite right
          self.totalFood += o.size
          self.eaten += 1
          edibles.push o
        return

      return

    
    #Compute step magnitude and apply facing direction
    newX = @stepSize * @facing[0]
    newY = @stepSize * @facing[1]

    [newX, newY] = boundsObj.pathClear(self, {x:newX, y:newY})
    
    @x += newX
    @y += newY
    @age += 1
    @within boundsObj
    if @totalFood < 0
      [this]
    else
      edibles

  #
  #    As the Walker implementation, but also reverse the facing along
  #    the impinging axis
  #
  within: (boundsObj, escape = true) ->
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
    positionsSensed = []
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
            
            #Don't sense yourself
            arenaObj.positions[x][y].forEach (o, i) ->
              if o.id != self.id
                beingsSensed.push
                  pos: [x, y]
                  being: arenaObj.positions[x][y]

              return

    console.log beingsSensed  if beingsSensed.length > 1
    return beingsSensed


  #STUB
  death: (boundsObj) ->
    console.log(@id + " died");

  #STUB
  replicate: (boundsObj) ->
    boundsObj.addSeeker this
    boundsObj.addSeeker this
    return


#
#Export Classes for Node 
#
try
  exports.Walker = Walker
  exports.Seeker = Seeker
  exports.Arena = Arena
  exports.Utils = {fillRegionWithPolygon: fillRegionWithPolygon}