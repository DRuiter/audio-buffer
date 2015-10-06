var	FFT					= require("./fft"),
		TimedBuffer = require('./timed-buffer');

function AudioBuffer (timeMS, options){
	if(typeof(options) !== 'object') options = {};

	var self = this;

	this.sampleRate = options.sampleRate || 44100;
	this.fftSize 		= options.fftSize || 1024;
	this.binSize		= Math.floor(this.sampleRate/this.fftSize);

	this.fft 		= new FFT(this.fftSize);
	this.PCM 		= new TimedBuffer(timeMS, options);
	this.FFT 		= new TimedBuffer(timeMS, options);

	this.getFrequencyData = function ( PCMSample ){
		var fourier			= this.fft.forward(PCMSample),
			frequencyData 	= [];

		for(var i = 0, l = fourier.real.length; i < l; i++){
			var real 		= fourier.real[i],
				imag 		= fourier.imag[i],
				magnitude 	= Math.sqrt((real*real)+(imag*imag));

			frequencyData.push(magnitude);
		}

		return frequencyData
			.slice(0, (this.fftSize/2)+1)
			.map(function (item, index){
				var sampleInfo = {
					freq 		: Math.round((index * self.sampleRate/2)/(self.fftSize/2)),
					db	 		: Math.round((20 * (Math.log(item) / Math.LN10))+100)
				};

				return sampleInfo;
			});
	};

	this.condenseSample = function (FFTSample, factor){
		var condensed 	= [
				[]
			],
			hasHistory	= false,
			iterator	= 0;

		if(FFTSample[0].mean !== 'undefined') hasHistory = true;

		function averageArray(array){
			return array.reduce(function (prev, cur, index, array){
				if(index === array.length-1){
					return Math.round((prev+cur)/array.length);
				} else {
					return prev+cur;
				}
			});
		}

		if(hasHistory){

			FFTSample.forEach(function (item, index){
				if(index === 0) {
					condensed[iterator] = {
						db 								: [],
						mean 							: [],
						meanDiff 					: [],
						variance 					: [],
						standardDeviation : []
					};
				}

				if(index !== 0 && index%factor === 0) {
					condensed[iterator].db = averageArray(condensed[iterator].db);
					condensed[iterator].mean = averageArray(condensed[iterator].mean);
					condensed[iterator].meanDiff = averageArray(condensed[iterator].meanDiff);
					condensed[iterator].variance = averageArray(condensed[iterator].variance);
					condensed[iterator].standardDeviation = averageArray(condensed[iterator].standardDeviation);

					condensed.push({
						db 					: [],
						mean 				: [],
						meanDiff 			: [],
						variance 			: [],
						standardDeviation 	: []
					});

					iterator++;
				}

				condensed[iterator].db.push(item.db);
				condensed[iterator].mean.push(item.mean);
				condensed[iterator].meanDiff.push(item.meanDiff);
				condensed[iterator].variance.push(item.variance);
				condensed[iterator].standardDeviation.push(item.standardDeviation);
			});

			return condensed.map(function (item, index, array){
				var times = index+1;

				item.freq = [(self.binSize*factor*index), (self.binSize*factor*times)];

				return item;
			});

		} else {

			FFTSample.forEach(function (item, index){
				if(index !== 0 && index%factor === 0) {
					condensed[iterator] = averageArray(condensed[iterator]);
					condensed.push([]);
					iterator++;
				}

				condensed[iterator].push(item.db);
			});

			return condensed.map(function (item, index, array){
				var times = index+1;

				return {
					db 		: item,
					freq	: [(self.binSize*factor*index), (self.binSize*factor*times)]
				};
			});
		}
	};

	this.averageSample = function ( FFTArray ){
		var average = [];

		FFTArray.forEach(function (array){
			array.forEach(function (item, index){
				if(!average[index])
					average[index] = item;
				else
					average[index].db += item.db;
			});
		});

		return average.map(function (item){
			item.db = item.db/FFTArray.length;
			return item;
		});
	};

	this.calculateHistory = function ( FFTSample, timeMS ){
		if(!timeMS) timeMS = 500;

		var compare 			= this.FFT.getByTime(timeMS),
			sortedByBin 		= [],
			mean,
			meanDiff,
			variance,
			standardDeviation;

		FFTSample.forEach(function(){
			sortedByBin.push([]);
		});

		compare.forEach(function (sample, index){
			sample.forEach(function (item, innerIndex){
				sortedByBin[innerIndex].push(item.db);
			});
		});

		mean = sortedByBin.map(function (item, index){
			return item.reduce(function (prev, cur, innerIndex, array){
				if(innerIndex === array.length-1)
					return (prev+cur)/array.length;
				else
					return prev+cur;
			});
		});

		meanDiff = sortedByBin.map(function (item, index){
			return item.map(function (innerItem, innerIndex){
				return innerItem-mean[index];
			});
		});

		variance = meanDiff.map(function (item, index){
			return item.reduce(function (prev, cur, innerIndex, array){
				if(innerIndex === array.length-1)
					return (prev+Math.pow(cur, 2))/array.length;
				else
					return prev+Math.pow(cur, 2);
			});
		});

		standardDeviation = variance.map(function (item, index){
			return Math.round(Math.sqrt(item, 2));
		});

		return FFTSample.map(function (item, index){
			item.mean 				= mean[index];
			item.meanDiff			= item.db-mean[index];
			item.variance			= variance[index];
			item.standardDeviation 	= standardDeviation[index];

			return item;
		});
	};

	this.getLast		= function (options){
		if(options == null) options = {};

		options.condensationFactor = options.condensationFactor || 1;

		var sample = this.FFT.buffer[this.FFT.buffer.length-1];

		return this.condenseSample(sample, options.condensationFactor);
	};

	this.getSample		= function (timeMS, options){
		if(typeof(options) !== 'object') options = {};

		var sample;

		if(options.addHistory)
			sample = this.calculateHistory(this.toSample(this.FFT.getByTime(timeMS)), 1000);
		else
			sample = this.toSample(this.FFT.getByTime(timeMS));

		if(options.condensationFactor && typeof(options.condensationFactor) === 'number')
			return this.condenseSample(sample, options.condensationFactor);
		else
			return sample;
	};

	this.toSample = function( FFTArray ){
		var sample = [];

		FFTArray.forEach(function (FFTSample, index){
			FFTSample.forEach(function (item, i){
				if(typeof(sample[i]) !== 'object')
					sample[i] = item;
				else
					sample[i].db = sample[i].db+item.db;
			});
		});

		return sample.map(function (item){
			item.db = Math.round(item.db/FFTArray.length);

			return item;
		});
	};

	this.getFrequencyRange = function (FFTSample, start, end){
		return FFTSample.filter(function (item){
			if(item.freq >= start && item.freq <= end) return item;
		});
	};

	this.push = function ( PCMSample ) {
		this.PCM.push(PCMSample);
		this.FFT.push(this.getFrequencyData(PCMSample));
	};

	return this;
}

module.exports = AudioBuffer;
