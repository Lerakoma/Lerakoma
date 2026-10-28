import { ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroBgPattern from "@/components/HeroBgPattern";
import slgLogo from "@/assets/SLG_LogoLight.png";
import apcLogo from "@/assets/APC_Consultancy.png";
import ppLogo from "@/assets/PlainlyPowered_Logo.svg";

const initiatives = [
  {
    name: "Supported Living Gateway",
    role: "Co-Founder",
    logo: slgLogo,
    url: "https://www.supportedlivinggateway.com" as string | undefined,
    summary:
      "Supported Living Gateway connects property investors with supported living providers to create more homes for those who need them most. Founded in 2020 as part of a wider founding team, the Gateway was born from a gap Mark and Leah identified during the pandemic — when investors were under pressure and care providers were struggling to find suitable housing.",
    details: [
      "The platform operates as a dedicated property portal for the supported living sector — helping care providers, charities, and registered providers find properties to grow their businesses.",
      "The team behind the Gateway have over 70 years of combined experience in property investing, with a portfolio exceeding £8 million and 56 supported living units currently under management across varied tenant types.",
      "The Gateway provides connections, resources, and assistance to help investors make sustainable investments while creating genuine social impact — homes for vulnerable adults who need specialist accommodation.",
    ],
    mission: "Connecting supported living providers with property investors to create more homes for those who need them most.",
  },
  {
    name: "Plainly Powered",
    role: "Founder",
    logo: ppLogo,
    url: "https://plainlypowered.com" as string | undefined,
    summary:
      "Plainly Powered helps local businesses put AI to work on the jobs that eat their week. Each project follows the same three steps: review where the time actually goes, build one useful fix that works from day one, then show the owner how to run it themselves, in plain English.",
    details: [
      "A website that works as hard as the business does — clear, quick and kept fresh with regular writing in the owner's own voice, so enquiries keep arriving even when no one can pick up the phone.",
      "Repetitive admin such as quotes, stock and bookkeeping turned into something done at the press of a button, freeing up hours every week for the work that actually grows the business.",
      "A practical social media plan built around what's working in the sector right now, handed over ready to follow — and every fix is one the business can run itself, without being tied to ongoing support.",
    ],
    mission: "Helping local businesses get their week back, with AI that's built for them and explained in plain English.",
  },
  {
    name: "Advance Project Consultancy",
    role: "Founder",
    logo: apcLogo,
    summary:
      "Advance Project Consultancy delivered specialist project management training courses for property investors, equipping them with the skills and frameworks needed to manage construction projects confidently. The company built a strong reputation in the investor community before the pandemic forced its closure.",
    details: [
      "The courses covered everything from feasibility and budgeting through to on-site delivery — giving investors the confidence to oversee their own builds and refurbishments without relying entirely on third parties.",
      "The Advance brand has since been folded into Lerakoma, but the same principles of structured, professional project delivery remain at the heart of everything we do.",
    ],
    mission: "Delivering Reliable Project Management Training & Support To Help Property Investors & Developers Plan, Monitor & Report With High Level Of Efficiency",
  },
];

const Initiatives = () => (
  <div className="min-h-screen flex flex-col">
    <Navbar />

    {/* Hero */}
    <section className="relative hero-gradient pt-16 overflow-hidden">
      <HeroBgPattern />
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-2xl">
          <p className="text-gold font-medium text-sm tracking-widest uppercase mb-4">
            Making a Difference
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground leading-tight mb-4">
            Our Initiatives
          </h1>
          <p className="text-primary-foreground/75 text-lg max-w-lg">
            Beyond our core business, we're proud to be involved in ventures that create real social impact and connect communities.
          </p>
        </div>
      </div>
    </section>

    {/* Initiatives */}
    <section className="flex-1 section-gradient py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto space-y-16">
          {initiatives.map((init) => (
            <article key={init.name} className="bg-card rounded-lg border shadow-sm overflow-hidden">
              {/* Logo */}
              {init.logo && (
                <div className="bg-white px-8 py-6 flex items-center justify-center border-b">
                  <img src={init.logo} alt={`${init.name} logo`} className="h-16 md:h-20 w-auto object-contain" />
                </div>
              )}
              <div className="p-8 md:p-10">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                  <div>
                    <span className="text-gold text-xs font-semibold uppercase tracking-wider">
                      {init.role}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-1 font-[family-name:var(--font-heading)]">
                      {init.name}
                    </h2>
                  </div>
                  {init.url && (
                    <a
                      href={init.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 transition-opacity"
                    >
                      Visit Website <ExternalLink size={15} />
                    </a>
                  )}
                </div>

                {/* Summary */}
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {init.summary}
                </p>

                {/* Details */}
                <div className="space-y-4 mb-6">
                  {init.details.map((d, i) => (
                    <p key={i} className="text-muted-foreground text-sm leading-relaxed">
                      {d}
                    </p>
                  ))}
                </div>

                {/* Mission Statement */}
                {init.mission && (
                  <div className="border-t pt-6 mt-6 text-center">
                    <p className="text-gold text-xs font-semibold uppercase tracking-wider mb-2">Our Mission</p>
                    <p className="text-gold font-bold italic leading-relaxed">
                      "{init.mission}"
                    </p>
                  </div>
                )}
              </div>
            </article>
          ))}

          {/* Placeholder for future initiatives */}
          <div className="border-2 border-dashed border-muted rounded-lg p-10 text-center">
            <p className="text-muted-foreground text-sm">
              More initiatives coming soon. We're always looking for ways to create positive impact.
            </p>
          </div>
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

export default Initiatives;
