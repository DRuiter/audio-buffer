audio-buffer
============

A buffer for Node that accepts PCM Samples and converts these into FFT Samples.

#Note

Currently not published on npm (still very much in development), I'll publish it after some further testing.

##Dependencies
- timed-buffer
- fft (currently using https://gist.github.com/mohayonao/3063634)

#Usage

##Instantiation
AudioBuffer takes 2 parameters.

- timeMS: length of the buffer in miliseconds.
- options: optional options object.
	- options.sampleRate: sample rate of the incoming PCM samples. (Default: 44100)
	- options.fftSize: size of the FFT (Default: 1024)

It also passes it's options object along to the constructor for the TimedBuffer (see: https://github.com/DRuiter/timed-buffer)

##Methods

###getFrequencyData
Accepts a PCM Sample and returns an FFT Sample.

###condenseSample
Accepts an FFTSample and a condensationFactor (int). An FFT Sample with 512 bins
and a condensationfactor of 2 will return an FFT Sample with 256 bins, averaging the
db over the condensed bins.

###calculateHistory
Accepts an FFT Sample and a time in miliseconds. Appends the following data to the FFT Sample
(for each bin) based on the requested history.

- mean
- mean difference
- variance
- standard deviation

###getLast
Accepts an optional options object with the following parameters:

- condensationFactor: (int) amount with which to condense the FFT Sample (see condenseSample)

###getSample
Accepts a time in miliseconds for creating an average FFT Sample (see toSample) and an optional options object with the following parameters:

- addHistory: (bool) adds history to the sample .
- condensationFactor: (int) amount with which to condense the FFT Sample (see condenseSample)

###toSample
Accepts an Array of FFT Samples, returns 1 FFT Sample that is the average of all supplied
FFT Samples.

###getFrequencyRange
Accepts an FFT Sample a frequency range to start at (int) and a frequency range to end at (int).
Returns an FFT Sample that is filtered to containt only frequency ranges >= start and <= end.

###push
Accepts a PCM Sample and pushes these to the internal PCM and FFT buffers.