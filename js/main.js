var arena = new Arena({minX: 0, maxX: 750, minY: 0, maxY: 500})


var TimeManager = function(tickInterval, fn){
    this.timerID = null
    this.startSimulation = null
    this.pauseSimulation = null
    this.tickInterval = tickInterval
    this.fn = fn
}
TimeManager.prototype.startSimulation = function(){
        this.timerID = setInterval(tick, this.tickInterval)
} 
TimeManager.prototype.pauseSimulation = function(){
        clearInterval(this.timerID)
}
TimeManager.prototype.setSpeed = function(tickInterval){
        tickInterval = tickInterval === undefined ? this.tickInterval : tickInterval
        clearInterval(this.timerID)
        this.tickInterval = tickInterval
        this.timerID = setInterval(this.fn, this.tickInterval)    
}

String.prototype.sluggify = function(){
    var parts = this.split(' ')
    var lower = parts.map(function(x){return x.toLowerCase()})
    var slug = lower.join('-')
    return slug
}

function clickSeekerHandler(d, i, j){
    $('.selected').removeClass('selected')
    seekerNodes.attr('selected', function(d){d.selected = false; return false})
    $('#' + d.id).addClass('selected')
    d.selected = true
}



function setSimulationClickHandler(func){
    container.on('click', null)
    container.on('click', func)
}

function clickAddNutrientHandler(){
    var pos = d3.mouse(this)
    console.log("Adding Nutrients")
    d3.range(500).map(function(i){arena.addWalker({type: "glucose", size: 1, x: pos[0], y:pos[1]})})
}

function clickGetPositionHandler(){
    var pos = d3.mouse(this)
    console.log(pos)
    pos = pos.map(Math.floor)
    console.log(pos)
    if(arena.positions[pos[0]] === undefined) {arena.positions[pos[0]] = {}}
    if(arena.positions[pos[0]][pos[1]] === undefined) {arena.positions[pos[0]][pos[1]] = {}}
    console.log(arena.positions[pos[0]][pos[1]])
}

function zoomed() {
    container.attr("transform", "scale(" + d3.event.scale + ")");
}
var zoom = d3.behavior.zoom().scaleExtent([1, 10])


timeManager = {}
container = {}
blockadeNodes = [];
walkerNodes = [];
seekerNodes = [];


function main(containerDiv, numWalkers, numSeekers, numPeriodicFood) {
    container = d3.select(containerDiv).append("svg").attr('width', arena.maxX).attr('height', arena.maxY)
    /*d3.range(3).map(function(i){
        var pos = arena.randomPositionWithin()
        pos.height = 100
        pos.width = 20
        arena.addObject( new Blockade(pos) )
    })
    d3.range(3).map(function(i){
        var pos = arena.randomPositionWithin()
        pos.height = 20
        pos.width = 100
        arena.addObject( new Blockade(pos) )
    })*/
    
    d3.range(numWalkers).map(function(i){arena.addWalker({type: "glucose", size: 1, stepSize: 10 }, true)})
    d3.range(numPeriodicFood).map(function(i){arena.addPeriodicWalker({type: "glucose", size: 1, frequency: 30}, true)})
    d3.range(numSeekers).map(function(i){arena.addSeeker({type: "e-coli", canEat: ["glucose", "bound-siderophore"]}, true)})
    d3.range(numSeekers).map(function(i){arena.addObject(new SiderophoreProducer({}), true)})

    setSimulationClickHandler(/*clickGetPositionHandler*/
                              clickAddNutrientHandler)
    function tick(d){
        /* Run the model forward one time step */
        arena.tick()

        blockadeNodes = container.selectAll("rect.blockade").data(arena.blockades)
        blockadeNodes.enter().append("rect")
        /*
            SVG rectangles draw with x, y being the upper left corner. 
            Translate the center up and away 
        */
        blockadeNodes.attr("x", function(d){ return d.x - d.width})
            .attr("y", function(d){ return d.y - d.height })
            .attr('width', function(d){ return d.width * 2})
            .attr('height', function(d){ return d.height * 2})
            .attr('id', function(d){ return d.id })
            .attr('class', "blockade")

        blockadeNodes.exit().remove()


        walkerNodes = container.selectAll(".walker").data(arena.walkers)
        walkerNodes.enter().append('circle')
            
        //Seperate creation of new nodes from node updates
        walkerNodes.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .attr("r", function(d){ return d.size })
            .attr("class", function(d) { return "walker "+d.type; })
            .attr("id", function(d) { return d.id })
        walkerNodes.exit().remove()

        seekerNodes = container.selectAll(".seeker").data(arena.actors)
        seekerNodes.enter().append('circle')
            
        //Seperate creation of new nodes from node updates
        seekerNodes.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .attr("r", function(d){ return d.size})
            .attr('id', function(d) { return d.id.split(' ').join('-')})
            .attr("class", function(d) { return "seeker " + d.state + " " + d.type + (d.selected ? ' selected' : ''); })
            .attr("id", function(d) { return d.id })
            .on("click", clickSeekerHandler)
        seekerNodes.exit().remove()
    }/*End tick()*/
    timeManager = new TimeManager(1, tick)
    timeManager.setSpeed()
    timeManager.startSimulation = function(){
        this.timerID = setInterval(tick, this.tickInterval)
    } 
    timeManager.pauseSimulation = function(){
        clearInterval(this.timerID)
    }

}
