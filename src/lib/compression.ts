import imageCompression from 'browser-image-compression';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Image compression options
const imageOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: false, // Disabled to prevent hanging in iframe/restricted environments
  initialQuality: 0.8,
};

export async function compressImage(file: File): Promise<File> {
  try {
    console.log(`Original image size: ${file.size / 1024 / 1024} MB`);
    
    // Add a 15-second timeout to prevent indefinite hanging
    const timeoutPromise = new Promise<File>((_, reject) => 
      setTimeout(() => reject(new Error('Image compression timed out')), 15000)
    );
    
    const compressionPromise = imageCompression(file, imageOptions);
    
    const compressedFile = await Promise.race([compressionPromise, timeoutPromise]);
    console.log(`Compressed image size: ${compressedFile.size / 1024 / 1024} MB`);
    return compressedFile;
  } catch (error) {
    console.error('Image compression error or timeout:', error);
    return file; // Return original if fails or times out
  }
}

let ffmpeg: FFmpeg | null = null;

async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}

export async function compressVideo(
  file: File, 
  onProgress?: (progress: number) => void
): Promise<File> {
  try {
    console.log(`Original video size: ${file.size / 1024 / 1024} MB`);
    
    // If video is already small enough (< 5MB), don't compress
    if (file.size < 5 * 1024 * 1024) {
      return file;
    }

    // Check if SharedArrayBuffer is available (required for FFmpeg in many browsers)
    if (typeof SharedArrayBuffer === 'undefined') {
      console.warn('SharedArrayBuffer is not available in this environment. Skipping video compression.');
      return file;
    }

    // Add a 60-second timeout for FFmpeg loading
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('FFmpeg loading timed out')), 60000)
    );

    const instance = await Promise.race([loadFFmpeg(), timeoutPromise]);
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';

    await instance.writeFile(inputName, await fetchFile(file));

    instance.on('progress', ({ progress }) => {
      if (onProgress) onProgress(Math.round(progress * 100));
    });

    // Compression command: 
    // -vcodec libx264: standard codec
    // -crf 28: quality (23 is default, 28 is lower quality/smaller size)
    // -preset faster: speed of compression
    await instance.exec(['-i', inputName, '-vcodec', 'libx264', '-crf', '28', '-preset', 'faster', outputName]);

    const data = await instance.readFile(outputName);
    const compressedBlob = new Blob([data], { type: 'video/mp4' });
    
    const compressedFile = new File([compressedBlob], file.name, {
      type: 'video/mp4',
    });

    console.log(`Compressed video size: ${compressedFile.size / 1024 / 1024} MB`);
    return compressedFile;
  } catch (error) {
    console.error('Video compression error:', error);
    return file; // Return original if fails
  }
}
