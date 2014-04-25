if modules?
	Random = (require 'random').Random

rng = new Random()


becomeSkyNet = false
Object.freeze becomeSkyNet

mutationRate = 0.2
strainCount = 1
heritableTraits = {}
heritableTraits.strain = "strain-1"
heritableTraits.stepSize = {}
heritableTraits.stepSize.baseValue = 5
heritableTraits.stepSize.currentValue = 5
heritableTraits.stepSize.randMean = -0.8
heritableTraits.stepSize.minValue = 1
heritableTraits.stepSize.maxValue = 100
heritableTraits.stepSize.cleanFunction = Math.round


mutate = (heritableTraits, random) -> 
	didMutate = false
	for traitName of heritableTraits	
		if /strain/.test(traitName)
			continue
		console.log "Looking at #{traitName}"
		probMutate = random.random()
		if probMutate <= mutationRate
			trait = heritableTraits[traitName]
			console.log "Mutation: #{probMutate}"
			
			mod = random.gauss(trait.randMean)
			console.log "Modifier: #{mod}"
			
			trait.currentValue += mod
			trait.currentValue = trait.cleanFunction(trait.currentValue)

			trait.currentValue = trait.minValue if trait.currentValue < trait.minValue
			trait.currentValue = trait.maxValue if trait.currentValue > trait.maxValue

			didMutate = true
	if didMutate
		heritableTraits.strain = "strain-#{++strainCount}"
	return heritableTraits
