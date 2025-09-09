import { createCanvas } from 'canvas'
import fs from 'fs'

// Generate a 400x400 placeholder image with text
function generatePlaceholder(text: string): Buffer {
  const canvas = createCanvas(400, 400)
  const ctx = canvas.getContext('2d')
  
  // Background
  ctx.fillStyle = '#f3f4f6'
  ctx.fillRect(0, 0, 400, 400)
  
  // Border
  ctx.strokeStyle = '#d1d5db'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, 398, 398)
  
  // Text
  ctx.fillStyle = '#6b7280'
  ctx.font = 'bold 48px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 200, 180)
  
  ctx.font = '24px sans-serif'
  ctx.fillText('Carousel Image', 200, 230)
  
  return canvas.toBuffer('image/png')
}

// Generate placeholders for testing
for (let i = 1; i <= 5; i++) {
  const buffer = generatePlaceholder(`Card ${i}`)
  fs.writeFileSync(`placeholder-${i}.png`, buffer)
  console.log(`Generated placeholder-${i}.png`)
}

console.log('\nBase64 for Card 1:')
console.log(generatePlaceholder('Card 1').toString('base64'))