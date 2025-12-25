// VobSub RLE decompression
// VobSub uses a simple run-length encoding where each pixel is represented by 2 bits

/**
 * Decoded RLE image with dimensions and indexed bitmap data
 */
export interface RLEDecodedImage {
  /** Image width in pixels */
  width: number
  /** Image height in pixels */
  height: number
  /** Indexed bitmap with palette indices 0-15 */
  data: Uint8Array
}

/**
 * Decode VobSub RLE-compressed image data
 * @param rleData - RLE-compressed data
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns Decoded indexed bitmap with 2-bit palette indices
 * @example
 * const decoded = decodeRLE(rleData, 720, 480)
 * console.log(decoded.data.length) // 720 * 480
 */
export function decodeRLE(rleData: Uint8Array, width: number, height: number): RLEDecodedImage {
  const output = new Uint8Array(width * height)
  let outputPos = 0
  let inputPos = 0

  while (inputPos < rleData.length && outputPos < output.length) {
    const byte = rleData[inputPos++]

    // Check for RLE escape sequence
    if (byte === 0x00) {
      if (inputPos >= rleData.length) break

      const next = rleData[inputPos++]

      if (next === 0x00) {
        // 00 00: End of line - pad to next line if not already there
        if (outputPos % width !== 0) {
          const currentLine = Math.floor(outputPos / width)
          outputPos = (currentLine + 1) * width
        }
      } else {
        // RLE run - decode count and color
        const color = next & 0x03  // Color is in bits 0-1
        let count = 0

        if ((next & 0xC0) === 0x00) {
          // 00 0x or 00 3x: Short/medium run (count in bits 2-7, color in bits 0-1)
          count = (next >> 2) & 0x3F
        } else if ((next & 0xC0) === 0x40) {
          // 00 4x yy: Long run (count from bits 2-7 of next + yy byte)
          if (inputPos < rleData.length) {
            const extraByte = rleData[inputPos++]
            count = ((next & 0x3F) << 2) | ((extraByte >> 6) & 0x03)
          }
        } else if ((next & 0xC0) === 0x80 || (next & 0xC0) === 0xC0) {
          // 00 8x or 00 Cx: Medium/long run (count in bits 2-7)
          count = (next >> 2) & 0x3F
        }

        for (let i = 0; i < count && outputPos < output.length; i++) {
          output[outputPos++] = color
        }
      }
    } else {
      // Not an escape - decode nibbles directly
      // Each byte contains 4 2-bit pixels
      const nibbles = [
        (byte >> 6) & 0x03,
        (byte >> 4) & 0x03,
        (byte >> 2) & 0x03,
        byte & 0x03,
      ]

      for (const nibble of nibbles) {
        if (outputPos < output.length) {
          output[outputPos++] = nibble
        }
      }
    }
  }

  return { width, height, data: output }
}

/**
 * Encode bitmap to VobSub RLE format
 * @param bitmap - Indexed bitmap with palette indices 0-3
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns RLE-compressed data
 * @example
 * const bitmap = new Uint8Array(720 * 480).fill(0)
 * const compressed = encodeRLE(bitmap, 720, 480)
 */
export function encodeRLE(bitmap: Uint8Array, width: number, height: number): Uint8Array {
  const output: number[] = []

  for (let y = 0; y < height; y++) {
    let x = 0
    const lineStart = y * width

    while (x < width) {
      const pos = lineStart + x
      const color = bitmap[pos]

      // Count run length
      let runLength = 1
      while (x + runLength < width && bitmap[lineStart + x + runLength] === color && runLength < 255) {
        runLength++
      }

      if (runLength >= 4) {
        // Use RLE encoding for runs >= 4
        if (runLength <= 15) {
          // Short run: 00 0x (count in bits 2-5, color in bits 0-1)
          output.push(0x00)
          output.push((runLength << 2) | color)
        } else if (runLength <= 63) {
          // Medium run: 00 Cx
          output.push(0x00)
          output.push(0xC0 | (runLength << 2) | color)
        } else {
          // Long run: 00 4x yy
          output.push(0x00)
          output.push(0x40 | ((runLength >> 2) & 0x3F))
          output.push((runLength & 0x03) << 6 | color)
        }

        x += runLength
      } else {
        // Collect literal pixels until we hit a run or line end
        const literals: number[] = []

        while (x < width) {
          const currentPos = lineStart + x
          const currentColor = bitmap[currentPos]

          // Check if there's a run starting here
          let nextRunLength = 1
          while (x + nextRunLength < width && bitmap[lineStart + x + nextRunLength] === currentColor && nextRunLength < 255) {
            nextRunLength++
          }

          if (nextRunLength >= 4) {
            // Found a run, stop collecting literals
            break
          }

          literals.push(currentColor)
          x++

          // Stop at 4 pixels (one byte)
          if (literals.length === 4) {
            break
          }
        }

        // Pad to 4 pixels
        while (literals.length < 4 && literals.length > 0) {
          literals.push(0)
        }

        // Encode as literal byte
        if (literals.length > 0) {
          const byte = (literals[0] << 6) | (literals[1] << 4) | (literals[2] << 2) | literals[3]
          output.push(byte)
        }
      }
    }

    // End of line marker
    output.push(0x00)
    output.push(0x00)
  }

  return new Uint8Array(output)
}
