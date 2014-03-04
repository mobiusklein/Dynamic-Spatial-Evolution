var arena = new Arena({minX: 0, maxX: 750, minY: 0, maxY: 500})

var timeManager = {
    timerID: null,
    startSimulation: null,
    pauseSimulation: null
}

TICKINTERVAL = 1

function main(container, numWalkers, numSeekers, numPeriodicFood) {
    svg = d3.select(container).append("svg").attr('width', arena.maxX).attr('height', arena.maxY)

    /* Externalize To the Window */
    d3.range(numWalkers).map(function(i){arena.addWalker({type: "glucose"})})
    window.walkerNodes = svg.selectAll(".walker").data(arena.walkers)

    d3.range(numPeriodicFood).map(function(i){arena.addPeriodicWalker({type: "glucose", frequency: 2000})})

    d3.range(numSeekers).map(function(i){arena.addSeeker({type: "E-coli"})})
    window.seekerNodes = svg.selectAll(".seeker").data(arena.actors)

    walkerNodes.enter().append('circle')
        .attr("r", function(d){ return d.size })
        .attr("class", function(d){ return "walker "+ d.type})
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })

    seekerNodes.enter().append('circle')
        .attr("r", function(d){ return d.size })
        .attr("class", function(d){ return "seeker "+ d.type})
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; }).on("click", function(evt){
            console.log(arguments, this)
        })

    function tick(d){
        /* Run the model forward one time step */
        arena.tick()

        walkerNodes = svg.selectAll(".walker").data(arena.walkers)
        walkerNodes.enter().append('circle')
            .attr("r", function(d){ return d.size })
        //Seperate creation of new nodes from node updates
        walkerNodes.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .attr("class", function(d) { return "walker "+d.type; })
        walkerNodes.exit().remove()

        seekerNodes = svg.selectAll(".seeker").data(arena.actors)
        seekerNodes.enter().append('circle')
            .attr("r", function(d){ return d.size})
        //Seperate creation of new nodes from node updates
        seekerNodes.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .attr("class", function(d) { return "seeker " + d.state + " " + d.type; })
            .on("click", function(d, i, j){
                console.log(d, i, j)
                $('.selected').removeClass('selected')
                seekerNodes.attr('selected', function(d){d.selected = false})
                $(this).addClass('selected')
                d.selected = true
            })


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
