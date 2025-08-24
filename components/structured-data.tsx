export function StructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "AdFire",
    "url": "https://adfire.io",
    "logo": "https://adfire.io/logo.png",
    "description": "AI-powered marketing automation platform that manages Meta & Google ads campaigns automatically",
    "sameAs": [
      "https://twitter.com/adfire",
      "https://linkedin.com/company/adfire",
      "https://github.com/adfire"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "support@adfire.io",
      "contactType": "customer support",
      "availableLanguage": ["English"]
    }
  }

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AdFire",
    "applicationCategory": "BusinessApplication",
    "applicationSubCategory": "Marketing Automation",
    "operatingSystem": "Web",
    "offers": [
      {
        "@type": "Offer",
        "name": "Free Automation",
        "price": "0",
        "priceCurrency": "EUR",
        "description": "Basic AI automation with 1 ad account"
      },
      {
        "@type": "Offer",
        "name": "Pro Autopilot",
        "price": "49",
        "priceCurrency": "EUR",
        "description": "Full AI automation for unlimited accounts"
      },
      {
        "@type": "Offer",
        "name": "Enterprise AI",
        "price": "299",
        "priceCurrency": "EUR",
        "description": "Advanced features for agencies and teams"
      }
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "2847",
      "bestRating": "5",
      "worstRating": "1"
    },
    "featureList": [
      "AI-powered campaign optimization",
      "Automated budget management",
      "Real-time performance tracking",
      "Multi-platform support (Meta & Google)",
      "Automated reporting",
      "24/7 monitoring",
      "ROAS optimization"
    ]
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is AdFire?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "AdFire is an AI-powered marketing automation platform that automatically manages and optimizes your Meta (Facebook & Instagram) and Google ads campaigns 24/7, eliminating manual work and increasing ROAS by an average of 47%."
        }
      },
      {
        "@type": "Question",
        "name": "How does AdFire's AI automation work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "AdFire connects to your ad accounts via official APIs, continuously monitors performance metrics, and automatically makes optimization decisions based on AI algorithms. It adjusts budgets, pauses underperforming ads, scales winners, and manages targeting without any manual intervention."
        }
      },
      {
        "@type": "Question",
        "name": "Which advertising platforms does AdFire support?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "AdFire currently supports Meta ads (Facebook & Instagram) and Google Ads (Search, Display, YouTube, Shopping). We're actively working on adding TikTok, LinkedIn, and other platforms."
        }
      },
      {
        "@type": "Question",
        "name": "Is there a free trial available?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! AdFire offers a free forever plan that includes basic AI automation for 1 ad account. You can upgrade to Pro or Enterprise plans anytime for unlimited accounts and advanced features."
        }
      },
      {
        "@type": "Question",
        "name": "How much can AdFire improve my ROAS?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our users see an average ROAS increase of 47% within the first month. Results vary based on your industry, ad spend, and current optimization level, but most users see significant improvements in campaign performance."
        }
      }
    ]
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://adfire.io"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Features",
        "item": "https://adfire.io/#features"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Pricing",
        "item": "https://adfire.io/#pricing"
      }
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  )
}