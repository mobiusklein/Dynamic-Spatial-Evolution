var arena = new Arena({minX: 0, maxX: 750, minY: 0, maxY: 500})

var timeManager = {
    timerID: null,
    startSimulation: null,
    pauseSimulation: null
}

TICKINTERVAL = 50

function clickSeekerHandler(d, i, j){
    $('.selected').removeClass('selected')
    seekerNodes.attr('selected', function(d){d.selected = false; return false})
    $('#' + d.id).addClass('selected')
    d.selected = true
}


function setSimulationClickHandler(func){
    svg.on('click', null)
    svg.on('click', func)
}

function clickAddNutrientHandler(){
    var pos = d3.mouse(this)
    console.log("Adding Nutrients")
    d3.range(500).map(function(i){arena.addWalker({type: "glucose", size: 1, x: pos[0], y:pos[1]})})
    console.log(arena.walkers)
}

function clickGetPositionHandler(){
    console.log(d3.mouse(this))
}

function zoomed() {
    svg.attr("transform", "scale(" + d3.event.scale + ")");
}
var zoom = d3.behavior.zoom().scaleExtent([1, 10])

svg = {}
walkerNodes = [];
seekerNodes = [];


function main(container, numWalkers, numSeekers, numPeriodicFood) {
    svg = d3.select(container).append("svg").attr('width', arena.maxX).attr('height', arena.maxY)
    svg.on('click', clickAddNutrientHandler)
    d3.range(numWalkers).map(function(i){arena.addWalker({type: "glucose", size: 1, stepSize: 10 })})
    d3.range(numPeriodicFood).map(function(i){arena.addPeriodicWalker({type: "glucose", size: 1, frequency: 100})})
    d3.range(numSeekers).map(function(i){arena.addSeeker({type: "E-coli", canEat: ["glucose"]})})
    d3.range(numSeekers).map(function(i){arena.addObject(new IronConsumer({}))})

    function tick(d){
        /* Run the model forward one time step */
        arena.tick()

        walkerNodes = svg.selectAll(".walker").data(arena.walkers)
        walkerNodes.enter().append('circle')
            
        //Seperate creation of new nodes from node updates
        walkerNodes.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .attr("r", function(d){ return d.size })
            .attr("class", function(d) { return "walker "+d.type; })
            .attr("id", function(d) { return d.id })
        walkerNodes.exit().remove()

        seekerNodes = svg.selectAll(".seeker").data(arena.actors)
        seekerNodes.enter().append('circle')
            .attr("r", function(d){ return d.size})
        //Seperate creation of new nodes from node updates
        seekerNodes.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .attr('id', function(d) { return d.id.split(' ').join('-')})
            .attr("class", function(d) { return "seeker " + d.state + " " + d.type + (d.selected ? ' selected' : ''); })
            .attr("id", function(d) { return d.id })
            .on("click", clickSeekerHandler)
        seekerNodes.exit().remove()
    }/*End tick()*/

    timeManager.timerID = setInterval(tick, TICKINTERVAL)
    timeManager.startSimulation = function(){
        this.timerID = setInterval(tick, TICKINTERVAL)
    } 
    timeManager.pauseSimulation = function(){
        clearInterval(this.timerID)
    }
}
