// public/audio-processor.js
class AudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.sampleRate = options?.processorOptions?.sampleRate || sampleRate || 48000;
    this.bufferSize = Math.floor(this.sampleRate * 0.085); 
    this._buffer = new Float32Array(this.bufferSize);
    this._bufferIndex = 0;

    this.port.onmessage = (event) => {
      if (event.data.sampleRate) {
        this.sampleRate = event.data.sampleRate;
        this.bufferSize = Math.floor(this.sampleRate * 0.085);
        this._buffer = new Float32Array(this.bufferSize);
        this._bufferIndex = 0;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const inputChannel = inputs[0]?.[0]; 

    if (inputChannel && inputChannel.length > 0) {
      let currentInputIndex = 0;
      while (currentInputIndex < inputChannel.length) {
        const remainingInBuffer = this.bufferSize - this._bufferIndex;
        const toCopy = Math.min(remainingInBuffer, inputChannel.length - currentInputIndex);
        
        this._buffer.set(inputChannel.subarray(currentInputIndex, currentInputIndex + toCopy), this._bufferIndex);
        this._bufferIndex += toCopy;
        currentInputIndex += toCopy;

        if (this._bufferIndex === this.bufferSize) {
          this.port.postMessage(this._buffer.slice().buffer); 
          this._bufferIndex = 0; 
        }
      }
    }
    return true; 
  }
}

registerProcessor('audio-processor', AudioProcessor); 