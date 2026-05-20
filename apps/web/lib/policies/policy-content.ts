export type PolicySection = {
  heading: string;
  body: string;
  bullets?: string[];
};

export type PolicyContent = {
  slug: string;
  title: string;
  description: string;
  intro: string;
  sections: PolicySection[];
};

export const policies: Record<string, PolicyContent> = {
  terms: {
    slug: 'terms',
    title: 'Terms and General Platform Policy',
        description: 'General terms for using Gharazi Pakistan as a real-estate marketplace and discovery platform.',
        intro: 'These draft terms explain the responsibilities of users, advertisers, and Gharazi while using the platform. They are prepared for public beta and should be reviewed by qualified legal counsel before full public launch.',
    sections: [
        { heading: 'Introduction', body: 'Gharazi.pk provides digital tools for real-estate discovery, communication, listing management, project discovery, and related content in Pakistan.' },
        { heading: 'Marketplace role', body: 'Gharazi acts as a marketplace and intermediary technology platform. Unless expressly stated, Gharazi does not own, sell, rent, broker, or directly transact properties.' },
      { heading: 'User eligibility and account responsibility', body: 'Users are responsible for providing accurate account information, maintaining account security, and using the platform only for lawful real-estate and related purposes.' },
        { heading: 'User-generated and third-party content', body: 'Listings, projects, ads, messages, comments, and other content may be submitted by owners, agents, developers, advertisers, or other third parties. Gharazi may review or moderate content but does not guarantee every statement is complete or accurate.' },
      { heading: 'Independent verification', body: 'Buyers, tenants, and investors must independently verify ownership, legal status, documentation, pricing, availability, possession, approvals, measurements, taxes, fees, and any other transaction-critical information.' },
        { heading: 'Lister and developer responsibility', body: 'Owners, agents, agencies, developers, and advertisers are responsible for the accuracy, legality, and freshness of information they publish or communicate through Gharazi.' },
      { heading: 'Communication between users', body: 'Users should communicate respectfully, avoid sharing sensitive financial information unnecessarily, and verify counterparties independently before visits, payments, or documentation exchange.' },
      { heading: 'Payments, promotions, and advertising', body: 'Advertising, promotion, and subscription packages may provide visibility or platform features, but do not guarantee sales, rentals, leads, conversions, rankings, or transaction outcomes.' },
      { heading: 'Prohibited activities', body: 'Users may not post fake listings, impersonate others, misrepresent property rights, scrape the service, spam users, upload malicious content, harass others, or use the platform for unlawful activity.' },
        { heading: 'Moderation and account action', body: 'Gharazi may remove content, restrict features, suspend accounts, block users, or report activity where needed to protect users, comply with obligations, or preserve platform quality.' },
        { heading: 'Intellectual property', body: 'Gharazi branding, interface, software, and platform content are protected. Users must only upload content they own or are authorized to publish.' },
        { heading: 'Limitation of liability', body: 'Use of the platform is at the user’s own risk. To the extent permitted by law, Gharazi is not liable for third-party content, failed transactions, inaccurate listings, user conduct, investment decisions, or indirect losses.' },
        { heading: 'Changes to terms', body: 'Gharazi may update these terms as the product, law, or business model changes. Updated versions will be published on this page.' },
        { heading: 'Contact', body: 'Questions about these terms can be sent through the Contact page or to info@gharazi.pk.' },
    ],
  },
  privacy: {
    slug: 'privacy-policy',
    title: 'Privacy and Data Usage Policy',
    description: 'How Gharazi Pakistan collects, uses, shares, and protects user and marketplace data.',
    intro: 'This draft policy describes expected data handling for Gharazi public beta. It is intended to be transparent and practical, without overstating legal compliance or absolute security guarantees.',
    sections: [
      { heading: 'Information collected', body: 'Gharazi may collect account, profile, listing, project, inquiry, chat, notification, support, analytics, device, cookie, and usage information.', bullets: ['Name, email, phone, role, company/profile details', 'Listings, projects, media metadata, favorites, saved searches, inquiries, and chats', 'Feedback, contact, support, advertising inquiries, and blog remarks', 'Device, browser, IP, cookie, and analytics events where enabled'] },
      { heading: 'How information is used', body: 'Information is used to operate accounts, deliver inquiries and chat messages, manage listings and projects, send notifications, improve search, prevent fraud/spam, provide support, analyze product usage, and meet legal or security needs.' },
      { heading: 'When information is shared', body: 'Information may be shared between users when they initiate inquiries, chats, or listing/project interactions. It may also be shared with service providers for hosting, email, analytics, payments, storage, search, support, or legal/security purposes.' },
      { heading: 'Data security', body: 'Gharazi uses reasonable technical and organizational safeguards appropriate for a beta marketplace. No internet service can promise absolute security, and users should protect their credentials and communications.' },
      { heading: 'User choices and updates', body: 'Users may update profile information through dashboard settings where available and may contact support for account or privacy questions.' },
      { heading: 'Retention', body: 'Gharazi retains information as needed for account operation, marketplace records, dispute prevention, compliance, analytics, security, and support. Retention periods may vary by data type.' },
      { heading: 'Cookies and analytics', body: 'The web app may use essential storage, analytics, preferences, advertising tools, maps, WordPress embeds, or similar technologies when configured. See the Cookie Policy for more detail.' },
      { heading: 'Children and minors', body: 'Gharazi is intended for adult users and legitimate property-market participants. Minors should not create accounts or submit personal information without appropriate guardian involvement.' },
      { heading: 'Privacy contact', body: 'Privacy questions can be sent through the Contact page or to support@Gharazi.pk.' },
    ],
  },
  disclaimer: {
    slug: 'disclaimer',
    title: 'Disclaimer Policy',
    description: 'Important limitations for listings, projects, tools, guides, recommendations, and platform information.',
    intro: 'All recommendations, suggestions, tools, blogs, comparisons, and insights are provided for general information only. Use of the platform and reliance on information is at the user’s own risk.',
    sections: [
      { heading: 'Informational purpose only', body: 'Gharazi content is provided to help users discover and compare information. It should not be treated as final transaction, legal, financial, tax, construction, or investment advice.' },
      { heading: 'No professional advice', body: 'Users should seek professional advice from lawyers, tax advisers, financial advisers, surveyors, architects, engineers, brokers, or other qualified professionals where needed.' },
      { heading: 'Third-party listings and projects', body: 'Listings and project information may be submitted by owners, agents, developers, or advertisers. Gharazi does not guarantee property availability, legal title, pricing accuracy, developer claims, approvals, possession, ROI, rental yield, or transaction outcome.' },
      { heading: 'Tools and comparisons', body: 'Calculators, comparisons, investment summaries, recommendations, price indicators, or decision-support tools are indicative only and may rely on incomplete, changing, or third-party data.' },
      { heading: 'Blogs and guides', body: 'Blog posts, guides, recommendations, and insights are based on general market understanding and best available information at the time. They should be independently verified.' },
      { heading: 'User decisions', body: 'Users make property, financial, legal, and investment decisions at their own risk and should independently verify information before making commitments.' },
    ],
  },
  antiSpam: {
    slug: 'anti-spam-policy',
    title: 'Anti-Spam and Abuse Policy',
    description: 'Rules against spam, fake listings, fraud, scraping, harassment, and abusive marketplace behavior.',
    intro: 'Gharazi is designed for genuine real-estate activity. Spam, abuse, fake inventory, and misleading communication harm users and may lead to enforcement action.',
    sections: [
      { heading: 'Prohibited spam and abuse', body: 'Users may not send unsolicited bulk messages, repetitive irrelevant inquiries, manipulative promotions, or content designed to overwhelm other users or the platform.' },
      { heading: 'Fake or misleading content', body: 'Fake listings, bait pricing, false availability, duplicate manipulation, incorrect ownership claims, and misleading project claims are prohibited.' },
      { heading: 'Impersonation and fraud', body: 'Users may not impersonate owners, agents, developers, Gharazi staff, regulators, banks, or other parties.' },
      { heading: 'Scraping and automated misuse', body: 'Automated scraping, credential stuffing, spam bots, unauthorized data extraction, and abusive crawling are not allowed.' },
      { heading: 'Harassment and abusive chat', body: 'Threats, harassment, hate, intimidation, abusive messages, and inappropriate conduct in inquiry or chat flows are prohibited.' },
      { heading: 'Malware and suspicious links', body: 'Users must not share malware, phishing links, fraudulent payment links, or deceptive external forms.' },
      { heading: 'Reporting abuse', body: 'Users can report suspicious listings, messages, or accounts through report links, support, or contact forms.' },
      { heading: 'Enforcement', body: 'Gharazi may warn users, remove content, restrict features, suspend accounts, block users, or report activity to relevant authorities where required.' },
    ],
  },
  neutrality: {
    slug: 'platform-neutrality',
    title: 'Platform Neutrality and Non-Endorsement Statement',
    description: 'How Gharazi treats featured, sponsored, recommended, verified, and reputation signals.',
    intro: 'Gharazi aims to operate as a neutral marketplace. Visibility labels, trust signals, and recommendations are intended to help discovery, not guarantee outcomes.',
    sections: [
      { heading: 'Neutral marketplace role', body: 'Gharazi does not unfairly favor or guarantee any agent, agency, developer, service provider, listing, project, or advertiser.' },
      { heading: 'No guaranteed endorsement', body: 'Featured, verified, premium, sponsored, recommended, or highlighted items should not be treated as a guarantee of service quality, legal status, transaction success, or investment performance.' },
      { heading: 'Sponsored and promoted placements', body: 'Featured, premium, or sponsored labels may indicate paid or highlighted placement. Such labels provide visibility, not endorsement or guarantee.' },
      { heading: 'Ratings, testimonials, and reputation', body: 'Any testimonials, ratings, reviews, response behavior, verification signals, or reputation highlights are indicative and should not be treated as conclusive endorsement.' },
      { heading: 'Recommendation signals', body: 'Recommendations may be based on available data, quality signals, testimonials, feedback, service quality indicators, response behavior, reputation, sponsorship, and/or platform activity where applicable.' },
      { heading: 'User responsibility', body: 'Users should independently evaluate agents, developers, advertisers, service providers, listings, and projects before decisions or transactions.' },
    ],
  },
  advertisingDisclaimer: {
    slug: 'advertising-disclaimer',
    title: 'Advertising Disclaimer',
    description: 'Important limitations for Gharazi advertising packages, sponsored placements, campaign metrics, and lead expectations.',
    intro: 'Advertising packages on Gharazi are designed to provide visibility and campaign surfaces. They do not guarantee sales, rentals, leads, conversions, rankings, or transaction outcomes.',
    sections: [
      { heading: 'Visibility, not guaranteed outcomes', body: 'Advertising packages may improve visibility or access to promotional placements, but results depend on listing quality, pricing, market conditions, location, user demand, responsiveness, and campaign scope.' },
      { heading: 'Sponsored labels', body: 'Sponsored, featured, premium, promoted, or similar labels should be clearly visible to users. Such labels indicate paid or highlighted placement, not a guarantee or endorsement.' },
      { heading: 'Content review', body: 'Gharazi may review, request changes to, reject, pause, or remove advertising content that is misleading, low quality, unlawful, harmful, or inconsistent with platform standards.' },
      { heading: 'Advertiser responsibility', body: 'Advertisers remain responsible for the accuracy, legality, permissions, claims, pricing, images, project details, offers, and compliance of their advertisements.' },
      { heading: 'Metrics and reporting', body: 'Campaign metrics, dashboards, impressions, clicks, inquiries, or performance summaries are platform-recorded or estimated indicators and are not guarantees of commercial outcome.' },
    ],
  },
  cookies: {
    slug: 'cookie-policy',
    title: 'Cookie Policy',
    description: 'How Gharazi uses cookies, local storage, analytics, preferences, advertising, and third-party technologies.',
    intro: 'This policy describes cookies and similar technologies used or planned for Gharazi public beta.',
    sections: [
      { heading: 'What cookies are', body: 'Cookies and similar technologies store small pieces of information in a browser or device to support site functionality, preferences, analytics, and integrations.' },
      { heading: 'Types of cookies used', body: 'Gharazi may use essential storage for login and security, preference storage for UI choices, analytics tools for product improvement, and advertising or marketing technologies if enabled later.' },
      { heading: 'Third-party tools', body: 'The site may integrate tools such as analytics, ads, WordPress content, maps, media storage, email, payment, or hosting services. These providers may process technical or usage information under their own terms.' },
      { heading: 'User controls', body: 'Users can manage or delete cookies and local storage through browser settings. Some essential features may not work properly if required storage is disabled.' },
      { heading: 'Policy updates', body: 'This policy may be updated as analytics, advertising, maps, and consent features mature.' },
    ],
  },
};

export const policyList = [policies.terms, policies.privacy, policies.disclaimer, policies.antiSpam, policies.neutrality, policies.advertisingDisclaimer, policies.cookies];
