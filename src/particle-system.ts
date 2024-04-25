import { getTargetPosition, vec3Sub } from './utils'
import { type Buffer, type Framebuffer, type Texture, type TextureOptions, type WebGLContext } from './webgl-context'
import { type ParticleTexture } from './particle-texture'

export class ParticleSystem {
  private readonly startIndex: number
  private currentLifetime: number = 0
  private maxLifetime: number = 0
  position: Float32Array = new Float32Array(3)
  readonly velocity: Float32Array = new Float32Array(3)
  private readonly textureData: [Float32Array, Float32Array] = [new Float32Array(0), new Float32Array(0)]
  private readonly particleSize: number
  readonly particleTexture: Texture
  framebuffer0: Framebuffer
  framebuffer1: Framebuffer
  readonly positionBuffer: Buffer

  constructor (gl: WebGLContext, texture: ParticleTexture, startIndex: number, endIndex: number, maxLifetime: number) {
    this.startIndex = startIndex
    this.maxLifetime = maxLifetime
    this.particleSize = texture.size
    this.particleTexture = texture.texture

    const textureOptions: TextureOptions = {
      type: WebGLRenderingContext.FLOAT,
      filter: WebGLRenderingContext.LINEAR,
      format: null,
      wrap: null,
      data: null
    }

    this.framebuffer0 = gl.createFramebuffer(texture.width, texture.height, textureOptions, false)
    this.framebuffer1 = gl.createFramebuffer(texture.width, texture.height, textureOptions, false)
    this.positionBuffer = texture.buffer
    this.textureData[0] = new Float32Array(endIndex - startIndex)
    this.textureData[1] = new Float32Array(endIndex - startIndex)

    this.updatePosition(0)
  }

  update (deltaTime: number, textureData: Float32Array): void {
    this.updateTextureData(textureData)
    this.updatePosition(deltaTime)
  }

  private updatePosition (deltaTime: number): void {
    const currentPosition = this.position
    const targetPosition = getTargetPosition(this.maxLifetime + 0.01, 1.5, 3)
    const dx = currentPosition[0] - targetPosition[0]
    const dy = currentPosition[1] - targetPosition[1]
    const dz = currentPosition[2] - targetPosition[2]
    const distance = 0.01 / (0.001 + Math.sqrt(dx * dx + dy * dy + dz * dz))
    const factor = 0.3 * Math.log(1 + 5 * distance)

    this.maxLifetime += this.currentLifetime * deltaTime * factor
    const newPosition = getTargetPosition(this.maxLifetime, 1.5, 3)
    vec3Sub(newPosition, currentPosition, this.velocity)
    this.position = newPosition
  }

  private updateTextureData (textureData: Float32Array): void {
    const dataLength = this.textureData[0].length
    let maxDifference = 0

    for (let i = 0; i < dataLength; ++i) {
      const difference = textureData[i + this.startIndex] - Math.min(this.textureData[0][i], this.textureData[1][i])
      const scaledDifference = 4 * difference
      maxDifference = Math.max(maxDifference, scaledDifference)
    }

    const normalizedDifference = Math.min(1, maxDifference)
    this.currentLifetime = Math.max(0.95 * this.currentLifetime, normalizedDifference)
    this.currentLifetime = Math.max(0.9 * this.currentLifetime, 3 * this.currentLifetime)

    for (let i = 0; i < dataLength; ++i) {
      this.textureData[1][i] = this.textureData[0][i]
      this.textureData[0][i] = textureData[i + this.startIndex]
    }
  }

  getOpacity (): number {
    return 0.05 * this.currentLifetime
  }
}
