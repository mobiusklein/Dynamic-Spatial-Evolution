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


function main(containerDiv, numWalkers, numConsumers, numProducers , numPeriodicFood) {
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
    
    pos1 = {x: 375, y:50, height:150, width:20}
    arena.addObject( new Blockade(pos1) )
    pos2 = {x: 375,  y:450, height:150, width:20}
    arena.addObject( new Blockade(pos2) )

    d3.range(numWalkers).map(function(i){arena.addWalker({type: "glucose", size: 1, stepSize: 10 }, true)})
    d3.range(numPeriodicFood).map(function(i){arena.addPeriodicWalker({type: "glucose", size: 1, frequency: 30}, true)})
    d3.range(numConsumers).map(function(i){arena.addSeeker({type: "e-coli", canEat: ["glucose", "bound-siderophore"]}, true)})
    d3.range(numProducers).map(function(i){arena.addObject(new SiderophoreProducer({}), true)})

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
    splineChart = populationSpline()
    highcharts_scatter()
}


function populationSpline() {
        Highcharts.setOptions({
            global: {
                useUTC: false
            }
        });
    
        var chartContainer = $('#plot-spline').highcharts({
            chart: {
                type: 'spline',
                animation: Highcharts.svg, // don't animate in old IE
                marginRight: 10,
            exporting: {
                enabled: true
            },
            events: {
                    load: function () {
    
                        // set up the updating of the chart each second
                        var series = this.series[0];
                        var series2 = this.series[1]
                        var Food = this.series[2]

                        setInterval(function() {
                            var chart = $(chartContainer).highcharts()
                            var x = arena.ticker, // current time
                                y = []
                                z = []
                                fud = arena.walkers.length
                                groups = _.groupBy(arena.actors, "type")
                                

                                a = groups['e-coli'].length
                                b = groups['siderophore-producer'].length
                                for(i=0;i<a;i++){
                                    y.push(1)
                                }
                                for(i=0;i<b;i++){
                                    z.push(1)
                                }

                            series.addPoint([x, y.length]),
                            series2.addPoint([x, z.length]),
                            Food.addPoint([x,fud/50]);

                        }, 1000);
                    }
                }
            },
            title: {
                text: 'Live Population data'
            },
            xAxis: {
                title: {
                    text: 'Arena Age (Ticks)'
                }

            },
            yAxis: {
                title: {
                    text: 'Population'
                },
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#808080'
                }]
            },
            tooltip: {

            },
            legend: {
                enabled: true
            },
            exporting: {
                enabled: false
            },
            series: [{
                name: 'Consumer',
                data: [],
                color: 'red',
                marker: {
                    enabled: false
                }
                },
                {
                name: 'Producer',
                data: [],
                color: 'blue',
                marker: {
                    enabled: false
                }
                },
                {
                    name: 'Food',
                    data: [],
                    color: 'black',
                marker: {
                    enabled: false
                }
                }

            ]
        });
    return chartContainer
}

function highcharts_scatter() {
        Highcharts.setOptions({
            global: {
                useUTC: false
            }
        });
    
        var chart;
        $('#plot-scatter').highcharts({
            chart: {
                type: 'scatter',
                animation: Highcharts.svg, // don't animate in old IE
                marginRight: 10,
                events: {
                    load: function() {
    
                        // set up the updating of the chart each second
                        var series = this.series[0];

                        setInterval(function() {
                            var x = arena.ticker, // current time
                                y = []
                                z = []
                                fud = arena.walkers.length
                                groups = _.groupBy(arena.actors, "type")

                                a = groups['e-coli'].length
                                b = groups['siderophore-producer'].length
                                for(i=0;i<a;i++){
                                    y.push(1)
                                }
                                for(i=0;i<b;i++){
                                    z.push(1)
                                }

                            series.addPoint([b, a]);

                        }, 1000);
                    }
                }
            },
            title: {
                text: 'Ratio of Species'
            },
            xAxis: {
                title: {
                    text: 'Consumers'
                }

            },
            yAxis: {
                title: {
                    text: 'Producers'
                },
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#808080'
                }]
            },

            legend: {
                enabled: true
            },
            exporting: {
                enabled: false
            },
            series: [{
                name: 'Population Ratio',
                data: [],
                color: 'red',
                marker: {
                    enabled: true
                }
                },

            ]
        });

}
