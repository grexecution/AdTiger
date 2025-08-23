import { getCreativeImageUrl, getAllCreativeImageUrls, getCreativeFormat } from '../lib/utils/creative-utils'

// Test with real data from the database
const testCreative = {
  "id": "614559451465915",
  "name": "{{product.name}} 2025-08-18-5f0d313494a2a2c16fd102459560707b",
  "asset_feed_spec": {
    "bodies": [
      {
        "text": "🦷 Stell dir vor, du findest endlich einen Kassenzahnarzt, bei dem du dich wohlfühlst:\n\n👍 Vertrauenswürdig \n👍 Freundlich \n👍 Kompetent\n\nBuche jetzt gleich online deinen Termin!\nWir akzeptieren alle Kassen."
      }
    ],
    "images": [
      {
        "url": "https://scontent-vie1-1.xx.fbcdn.net/v/t45.1600-4/530923015_1093255859084503_6789082811092838592_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=890911&_nc_ohc=AQYRsXEv_jIQ7kNvwGMmrD1&_nc_oc=AdmHke7cpKqySgRKtLAl6Qmz6iG2cdICSncQKfpedwDaVW66CGBHs6pp51OboRLYzK8&_nc_zt=1&_nc_ht=scontent-vie1-1.xx&edm=AJcBmwoEAAAA&_nc_gid=sVBL3ihEgbscZGu452i-dw&oh=00_AfUylaIwjTfSzbuoV6Q9kByyYbwGSgmzqkKn3et-VSo03w&oe=68AE5158",
        "hash": "6d6bf0b7f2b5ddb54a86e873ca7766c3",
        "name": "Review.jpg_105",
        "width": 1632,
        "height": 2048,
        "permalink_url": "https://www.facebook.com/ads/image/?d=AQIDcahuEaKrSsDpASsDT0sh2vnLHdnRkxIU06NKNjMwUX3R1GhiZGVp62lbwg_TTKYZWnQrsSBwbRjfsDKRu7LASMk3rzKYgrwKhCZcKSO4Oq7xN2tKfgqQ3kq1limR17NZxyhLxMoEmO-Hbjh0mw7R"
      },
      {
        "url": "https://scontent-vie1-1.xx.fbcdn.net/v/t45.1600-4/532392900_1849140132618651_1213341747746849030_n.jpg?_nc_cat=110&ccb=1-7&_nc_sid=890911&_nc_ohc=pHOHkoVhMEEQ7kNvwHwNbAa&_nc_oc=Adnoli-27owxikUe0R_tKvQlnc29dgP0H3ZbAEFB4FlYTkLLINJ6EwsMoSWmMkvvVF4&_nc_zt=1&_nc_ht=scontent-vie1-1.xx&edm=AJcBmwoEAAAA&_nc_gid=sVBL3ihEgbscZGu452i-dw&oh=00_AfU14XS7-lcsG203pyTpQA5GeQEB2fF2C5075a7MT13SCQ&oe=68AE52B9",
        "hash": "5cda7b59a7dfd712d5c624518d5d629a",
        "name": "Review 1_1.jpg_105",
        "width": 2048,
        "height": 2048,
        "permalink_url": "https://www.facebook.com/ads/image/?d=AQL7jiqCU2yTSna5gHHPdinPHJilT01O_0jHRPxQFFy52UJ97fOSqIqs9PSQmHMNWnNv_G5vqsak5M1erfaX9C95bgtvKqTWF57GXrGvXe9Mg9tzWVnnLJbIRqvyKXiqje4pek8OzmNN8XAYu66FBVjZ"
      },
      {
        "url": "https://scontent-vie1-1.xx.fbcdn.net/v/t45.1600-4/532185112_1678558452819746_1251095617980848175_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=890911&_nc_ohc=uarkIZvStsAQ7kNvwHoVsr1&_nc_oc=AdnSNZU1FVhZnAv8r3ceK0SltYttEWEIkiUMbFdmjf8f4uRDGBFK_OEnJ7cSbWJA_W0&_nc_zt=1&_nc_ht=scontent-vie1-1.xx&edm=AJcBmwoEAAAA&_nc_gid=sVBL3ihEgbscZGu452i-dw&oh=00_AfU62pDtAyycu9pcZCa9cIUQkfZ9kYmfd6lR5X-8lPAzTg&oe=68AE744D",
        "hash": "b5e2e0078963af5c2dbe45861b97ee8c",
        "name": "Review 9_16.jpg_105",
        "width": 1152,
        "height": 2048,
        "permalink_url": "https://www.facebook.com/ads/image/?d=AQLfmYg7G1_Wr6lD7AaCAJAG5m8nYmLR7TKOef8p9925Y_vEx2Cr4AWJUv1Y8CtCMRB7MwcyHHyZT3ueWLgksOEs17vebtF11GLb8I7P5OY9-JGxWEXc_5ZMyu6Wa-9qWmgbnIKGe5bAM_1BfI6tYEMS"
      }
    ],
    "titles": [
      {
        "text": "🦷 Stell dir vor, du findest endlich einen Kassenzahnarzt, bei dem du dich wohlfühlst:"
      }
    ]
  },
  "object_story_spec": {
    "page_id": "755468930975441",
    "instagram_user_id": "17841467073075583"
  }
}

console.log('🧪 Testing Creative Utils with real data...\n')

console.log('📸 Testing getCreativeImageUrl:')
const mainImageUrl = getCreativeImageUrl(testCreative)
console.log('Result:', mainImageUrl)
console.log('Expected: First image URL from asset_feed_spec.images[0].url\n')

console.log('🎠 Testing getAllCreativeImageUrls:')
const allImageUrls = getAllCreativeImageUrls(testCreative)
console.log('Result:', allImageUrls)
console.log('Expected: Array of 3 image URLs\n')

console.log('🎭 Testing getCreativeFormat:')
const format = getCreativeFormat(testCreative)
console.log('Result:', format)
console.log('Expected: "carousel" (3 images)\n')

console.log('✅ Testing complete!')