var arena = new Arena({minX: 0, maxX: 750, minY: 0, maxY: 500})

var timeManager = {
    timerID: null,
    startSimulation: null,
    pauseSimulation: null
}

function main(container, numWalkers, numSeekers) {
    svg = d3.select(container).append("svg").attr('width', arena.maxX).attr('height', arena.maxY)

    /* Externalize To the Window */
    d3.range(numWalkers).map(function(i){arena.addWalker({state: "glucose"})})
    window.walkerNodes = svg.selectAll(".walker").data(arena.walkers)

    d3.range(numSeekers).map(function(i){arena.addSeeker({state: "E-coli"})})
    window.seekerNodes = svg.selectAll(".seeker").data(arena.actors['seekers'])

    walkerNodes.enter().append('circle')
        .attr("r", function(d){ return d.size })
        .attr("class", function(d){ return "walker "+ d.state})
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })

    seekerNodes.enter().append('circle')
        .attr("r", function(d){ return d.size })
        .attr("class", function(d){ return "seeker "+ d.state})
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })

    function tick(d){
        /* Run the model forward one time step */
        arena.tick()

        walkerNodes = svg.selectAll(".walker").data(arena.walkers)
        walkerNodes.enter().append('circle')
            .attr("r", function(d){ return d.size })
        //console.log(walkerNodes)
        /* Update random walking nodes */
        walkerNodes[0].forEach(function(o, i){
            o.x = arena.walkers[i].x;
            o.y = arena.walkers[i].y;
        })
        walkerNodes.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .attr("class", function(d) { return "walker "+d.state; })
        walkerNodes.exit().remove()

        seekerNodes = svg.selectAll(".seeker").data(arena.actors['seekers'])
        seekerNodes.enter().append('circle')
            .attr("r", function(d){ return d.size})
        seekerNodes[0].forEach(function(o, i){
            o.x = arena.walkers[i].x;
            o.y = arena.walkers[i].y;
        })
        seekerNodes.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .attr("class", function(d) { return "seeker "+d.state; })
        seekerNodes.exit().remove()

    }/*End tick()*/

    timeManager.timerID = setInterval(tick, 1)
    timeManager.startSimulation = function(){
        this.timerID = setInterval(tick, 1)
    } 
    timeManager.pauseSimulation = function(){
        clearInterval(this.timerID)
    }
}
