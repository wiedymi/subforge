// VobSub .sub binary file parser (MPEG-PS packets)

/**
 * Parsed subtitle packet from VobSub .sub file
 */
export interface SubtitlePacket {
  /** Presentation timestamp in milliseconds */
  pts: number
  /** Display duration in milliseconds */
  duration: number
  /** Horizontal position in pixels */
  x: number
  /** Vertical position in pixels */
  y: number
  /** Image width in pixels */
  width: number
  /** Image height in pixels */
  height: number
  /** RLE-compressed image data */
  rleData: Uint8Array
  /** True if this is a forced subtitle */
  forced: boolean
}

/**
 * Parse subtitle packet from .sub file at given file position
 * @param data - Binary .sub file data
 * @param offset - Byte offset where packet starts
 * @returns Parsed subtitle packet or null if invalid
 * @example
 * const subData = Bun.file('movie.sub').arrayBuffer()
 * const packet = parseSubPacket(new Uint8Array(subData), 0x12345)
 */
export function parseSubPacket(data: Uint8Array, offset: number): SubtitlePacket | null {
  let pos = offset

  // Find MPEG-PS packet start code (00 00 01 BA)
  while (pos < data.length - 4) {
    if (data[pos] === 0x00 && data[pos + 1] === 0x00 && data[pos + 2] === 0x01 && data[pos + 3] === 0xBA) {
      break
    }
    pos++
  }

  if (pos >= data.length - 14) {
    return null
  }

  // Skip MPEG-PS pack header (14 bytes)
  pos += 14

  // Look for PES packet start code (00 00 01 BD - private stream 1)
  if (pos + 4 > data.length || data[pos] !== 0x00 || data[pos + 1] !== 0x00 || data[pos + 2] !== 0x01 || data[pos + 3] !== 0xBD) {
    return null
  }

  pos += 4

  // PES packet length (2 bytes)
  if (pos + 2 > data.length) return null
  const pesLength = (data[pos] << 8) | data[pos + 1]
  pos += 2

  const pesStart = pos
  const pesEnd = pesStart + pesLength

  if (pesEnd > data.length) {
    return null
  }

  // Skip PES header flags (2 bytes)
  pos += 2

  // PES header data length
  if (pos >= data.length) return null
  const pesHeaderDataLength = data[pos++]

  // Extract PTS if present
  let pts = 0
  if (pesHeaderDataLength >= 5 && pos + 5 <= data.length) {
    const ptsBits = data[pos]
    if ((ptsBits & 0xF0) === 0x20 || (ptsBits & 0xF0) === 0x30) {
      // PTS present
      const pts32_30 = (data[pos] & 0x0E) >> 1
      const pts29_15 = ((data[pos + 1] << 8) | data[pos + 2]) >> 1
      const pts14_0 = ((data[pos + 3] << 8) | data[pos + 4]) >> 1

      const ptsValue = (pts32_30 << 30) | (pts29_15 << 15) | pts14_0
      pts = Math.floor(ptsValue / 90)  // Convert 90kHz to milliseconds
    }
  }

  pos += pesHeaderDataLength

  // Subtitle stream ID (should be 0x20 for first subtitle stream)
  if (pos >= data.length) return null
  const streamId = data[pos++]

  // Subtitle packet size
  if (pos + 2 > data.length) return null
  const subPacketSize = (data[pos] << 8) | data[pos + 1]
  pos += 2

  const subPacketStart = pos
  const subPacketEnd = Math.min(subPacketStart + subPacketSize, pesEnd)

  if (subPacketEnd > data.length) {
    return null
  }

  // Parse control sequence to get dimensions and timing
  // The control sequence typically starts after the RLE data
  // For now, we'll search for it
  let controlSeqOffset = subPacketStart
  let controlInfo: ControlInfo | null = null

  // Try to find control sequence by looking for common control commands
  for (let searchPos = subPacketStart; searchPos < subPacketEnd - 10; searchPos++) {
    const maybeInfo = parseControlSequence(data, searchPos, subPacketEnd)
    if (maybeInfo && (maybeInfo.width > 0 || maybeInfo.height > 0)) {
      controlSeqOffset = searchPos
      controlInfo = maybeInfo
      break
    }
  }

  if (!controlInfo) {
    // Couldn't find valid control sequence, return null
    return null
  }

  // Extract RLE data (between data start and control sequence)
  const rleStart = subPacketStart
  const rleEnd = controlSeqOffset
  const rleData = data.slice(rleStart, rleEnd)

  return {
    pts,
    duration: controlInfo.duration,
    x: controlInfo.x,
    y: controlInfo.y,
    width: controlInfo.width,
    height: controlInfo.height,
    rleData,
    forced: controlInfo.forced,
  }
}

interface ControlInfo {
  duration: number
  x: number
  y: number
  width: number
  height: number
  forced: boolean
}

/**
 * Find control sequence in subtitle packet
 */
function findControlSequence(data: Uint8Array, start: number, end: number): number | null {
  // Control sequence typically starts after RLE data
  // Look for control sequence start marker
  for (let pos = start; pos < end - 2; pos++) {
    if (data[pos] === 0x00 && data[pos + 1] === 0x00) {
      // Found potential control sequence
      return pos
    }
  }

  // If not found with markers, use heuristic: control sequence is typically in last ~20 bytes
  if (end - start > 20) {
    return end - 20
  }

  return start
}

/**
 * Parse control sequence
 */
function parseControlSequence(data: Uint8Array, offset: number, end: number): ControlInfo | null {
  let pos = offset
  const info: ControlInfo = {
    duration: 0,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    forced: false,
  }

  while (pos < end) {
    if (pos >= data.length) break

    const cmd = data[pos++]

    switch (cmd) {
      case 0x00: // Force display
        info.forced = true
        break

      case 0x01: // Start display
        if (pos + 2 > end) return info
        // Skip timestamp (we use PTS instead)
        pos += 2
        break

      case 0x02: // Stop display
        if (pos + 2 > end) return info
        const stopTime = (data[pos] << 8) | data[pos + 1]
        info.duration = Math.floor(stopTime / 90 * 1024)  // Convert to ms
        pos += 2
        break

      case 0x03: // Palette info
        if (pos + 2 > end) return info
        pos += 2
        break

      case 0x04: // Alpha info
        if (pos + 2 > end) return info
        pos += 2
        break

      case 0x05: // Coordinates
        if (pos + 6 > end) return info
        const x1 = ((data[pos] << 4) | (data[pos + 1] >> 4))
        const x2 = (((data[pos + 1] & 0x0F) << 8) | data[pos + 2])
        const y1 = ((data[pos + 3] << 4) | (data[pos + 4] >> 4))
        const y2 = (((data[pos + 4] & 0x0F) << 8) | data[pos + 5])

        info.x = x1
        info.y = y1
        info.width = x2 - x1 + 1
        info.height = y2 - y1 + 1
        pos += 6
        break

      case 0x06: // RLE offsets
        if (pos + 4 > end) return info
        pos += 4
        break

      case 0xFF: // End of control sequence
        return info

      default:
        // Unknown command, skip
        break
    }
  }

  return info
}

/**
 * Create .sub binary data from subtitle packets
 * @param packets - Array of subtitle packets to encode
 * @returns Binary .sub file data
 * @example
 * const packets = [...]
 * const subData = createSubBinary(packets)
 * Bun.write('output.sub', subData)
 */
export function createSubBinary(packets: SubtitlePacket[]): Uint8Array {
  const chunks: Uint8Array[] = []

  for (const packet of packets) {
    const chunk = createSubPacketBinary(packet)
    chunks.push(chunk)
  }

  // Calculate total size
  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(totalSize)

  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result
}

/**
 * Create single subtitle packet binary
 */
function createSubPacketBinary(packet: SubtitlePacket): Uint8Array {
  const controlSeq = createControlSequence(packet)
  const subPacketSize = packet.rleData.length + controlSeq.length

  // Estimate sizes
  const pesHeaderSize = 3 + 5  // Flags + PTS
  const pesPayloadSize = 1 + 2 + subPacketSize  // Stream ID + size + data
  const pesLength = pesHeaderSize + pesPayloadSize

  const totalSize = 14 + 6 + pesLength  // Pack header + PES header + payload

  const data = new Uint8Array(totalSize)
  let pos = 0

  // MPEG-PS pack header (simplified)
  data[pos++] = 0x00
  data[pos++] = 0x00
  data[pos++] = 0x01
  data[pos++] = 0xBA

  // SCR (6 bytes in MPEG-2 format)
  const scr = packet.pts * 90
  data[pos++] = 0x44 | ((scr >> 30) & 0x03)
  data[pos++] = (scr >> 22) & 0xFF
  data[pos++] = 0x04 | ((scr >> 14) & 0xFC)
  data[pos++] = (scr >> 7) & 0xFF
  data[pos++] = 0x04 | ((scr << 1) & 0xFC)
  data[pos++] = 0x01  // SCR extension + marker

  // Mux rate and stuffing (4 bytes total for MPEG-2)
  data[pos++] = 0x01
  data[pos++] = 0x89
  data[pos++] = 0xC3
  data[pos++] = 0xF8  // Stuffing length = 0

  // PES packet header
  data[pos++] = 0x00
  data[pos++] = 0x00
  data[pos++] = 0x01
  data[pos++] = 0xBD  // Private stream 1

  // PES length
  data[pos++] = (pesLength >> 8) & 0xFF
  data[pos++] = pesLength & 0xFF

  // PES flags
  data[pos++] = 0x80  // Original/copy
  data[pos++] = 0x80  // PTS present

  // PES header data length
  data[pos++] = 5  // PTS length

  // PTS
  const ptsValue = packet.pts * 90
  data[pos++] = 0x21 | ((ptsValue >> 29) & 0x0E)
  data[pos++] = (ptsValue >> 22) & 0xFF
  data[pos++] = 0x01 | ((ptsValue >> 14) & 0xFE)
  data[pos++] = (ptsValue >> 7) & 0xFF
  data[pos++] = 0x01 | ((ptsValue << 1) & 0xFE)

  // Subtitle stream ID
  data[pos++] = 0x20

  // Subtitle packet size
  data[pos++] = (subPacketSize >> 8) & 0xFF
  data[pos++] = subPacketSize & 0xFF

  // RLE data
  data.set(packet.rleData, pos)
  pos += packet.rleData.length

  // Control sequence
  data.set(controlSeq, pos)

  return data
}

/**
 * Create control sequence for subtitle packet
 */
function createControlSequence(packet: SubtitlePacket): Uint8Array {
  const seq: number[] = []

  // Coordinates (cmd 0x05)
  const x1 = packet.x
  const x2 = packet.x + packet.width - 1
  const y1 = packet.y
  const y2 = packet.y + packet.height - 1

  seq.push(0x05)
  seq.push((x1 >> 4) & 0xFF)
  seq.push(((x1 & 0x0F) << 4) | ((x2 >> 8) & 0x0F))
  seq.push(x2 & 0xFF)
  seq.push((y1 >> 4) & 0xFF)
  seq.push(((y1 & 0x0F) << 4) | ((y2 >> 8) & 0x0F))
  seq.push(y2 & 0xFF)

  // Stop display (cmd 0x02)
  const stopTime = Math.floor(packet.duration * 90 / 1024)
  seq.push(0x02)
  seq.push((stopTime >> 8) & 0xFF)
  seq.push(stopTime & 0xFF)

  // Force flag (cmd 0x00)
  if (packet.forced) {
    seq.push(0x00)
  }

  // End of sequence
  seq.push(0xFF)

  return new Uint8Array(seq)
}
