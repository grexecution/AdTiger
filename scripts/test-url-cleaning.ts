// Helper function to get full resolution image URL
function getFullResolutionUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  
  // For Facebook CDN URLs, we need to be careful about what we remove
  // The stp parameter contains important settings, we just need to modify it
  
  // Check if this is a Facebook CDN URL with stp parameter
  if (url.includes('fbcdn.net') && url.includes('stp=')) {
    // Replace the stp parameter value to remove size restrictions
    return url.replace(
      /stp=([^&]*)/,
      (match, stpValue) => {
        // Remove size and quality restrictions from stp value
        const cleanedStp = stpValue
          .split('_')
          .filter((part: string) => {
            // Keep parts that aren't size or quality restrictions
            return !part.match(/^p\d+x\d+$/) && // Remove p64x64, p128x128, etc
                   !part.match(/^q\d+$/) && // Remove q75, q50, etc
                   !part.match(/^tt\d+$/) && // Remove tt6, etc
                   !part.startsWith('dst-') // Remove dst-jpg, dst-emg0, etc
          })
          .join('_')
        
        return cleanedStp ? `stp=${cleanedStp}` : ''
      }
    ).replace(/&&+/g, '&').replace(/[?&]$/g, '')
  }
  
  // For non-Facebook URLs or URLs without stp, return as is
  return url
}

// Test URL
const testUrl = "https://scontent-vie1-1.xx.fbcdn.net/v/t45.1600-4/530923015_1093255859084503_6789082811092838592_n.jpg?_nc_cat=102&ccb=1-7&_nc_ohc=AQYRsXEv_jIQ7kNvwGMmrD1&_nc_oc=AdmHke7cpKqySgRKtLAl6Qmz6iG2cdICSncQKfpedwDaVW66CGBHs6pp51OboRLYzK8&_nc_zt=1&_nc_ht=scontent-vie1-1.xx&edm=AOgd6ZUEAAAA&_nc_gid=8B7AbMkWivn_GVaLM_pJ_Q&stp=c0.5000x0.5000f_dst-emg0_p64x64_q75_tt6&ur=4c02d7&_nc_sid=58080a&oh=00_AfWjY2SWGFkuHPd0ZBPz6GH1sk8XSW6XjpPJuymXDLo6Rw&oe=68AE5158"

console.log("Original URL:")
console.log(testUrl)
console.log("\nCleaned URL:")
const cleaned = getFullResolutionUrl(testUrl)
console.log(cleaned)