import { Link } from "@tanstack/react-router";


const PlainlyPowered = () => (
  <a href="https://plainlypowered.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
    Plainly Powered
  </a>
);

const founders = [
  {
    name: "Mark Bowen",
    role: "Co-Founder & Director",
    bio: <>Mark has more than 40 years in software, over 30 of them in senior financial services roles leading major change programmes across technology, people and process. Today he focuses on consulting and mentoring businesses and entrepreneurs looking to grow, including AI and website work through <PlainlyPowered />, alongside managing Lerakoma’s portfolio and investor relationships.</>,
  },
  {
    name: "Leah Bowen",
    role: "Co-Founder & Director",
    bio: <>Leah has 25 years of experience across multiple industries in project office and change management roles, the majority in financial services supporting large-scale change programmes. She manages Lerakoma’s portfolio day to day, overseeing the administrative, operational and compliance requirements of each property, and leads the operations and social media strategy work at <PlainlyPowered />.</>,
  },
];

const About = () => (
  <section id="about" className="relative py-24 bg-background overflow-hidden">
    {/* Soft gold hexagon watermark — matches hero pattern style */}
    <svg
      className="absolute -left-20 top-1/4 w-[450px] md:w-[550px] lg:w-[650px] pointer-events-none select-none"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 600 800"
      fill="none"
      aria-hidden="true"
    >
      <polygon points="50,200 200,290 200,470 50,560 -100,470 -100,290" fill="hsl(var(--gold))" opacity="0.04" />
      <polygon points="50,200 200,290 50,380" fill="hsl(var(--gold))" opacity="0.06" />
      <polygon points="50,200 -100,290 50,380" fill="hsl(var(--gold))" opacity="0.045" />
      <polygon points="-100,290 50,380 -100,470" fill="hsl(var(--gold))" opacity="0.03" />
      <polygon points="50,200 200,290 200,470 50,560 -100,470 -100,290" stroke="hsl(var(--gold))" strokeWidth="0.8" opacity="0.07" />

      <polygon points="150,400 260,465 260,595 150,660 40,595 40,465" fill="hsl(var(--gold))" opacity="0.03" />
      <polygon points="150,400 260,465 150,530" fill="hsl(var(--gold))" opacity="0.05" />
      <polygon points="150,400 40,465 150,530" fill="hsl(var(--gold))" opacity="0.035" />
      <polygon points="150,400 260,465 260,595 150,660 40,595 40,465" stroke="hsl(var(--gold))" strokeWidth="0.6" opacity="0.06" />

      <polygon points="120,80 190,120 190,200 120,240 50,200 50,120" fill="hsl(var(--gold))" opacity="0.025" />
      <polygon points="120,80 190,120 120,160" fill="hsl(var(--gold))" opacity="0.04" />
      <polygon points="120,80 190,120 190,200 120,240 50,200 50,120" stroke="hsl(var(--gold))" strokeWidth="0.5" opacity="0.05" />

      <line x1="0" y1="0" x2="300" y2="400" stroke="hsl(var(--gold))" strokeWidth="0.5" opacity="0.03" />
      <line x1="0" y1="100" x2="250" y2="430" stroke="hsl(var(--gold))" strokeWidth="0.3" opacity="0.025" />
      <line x1="0" y1="800" x2="350" y2="500" stroke="hsl(var(--gold))" strokeWidth="0.4" opacity="0.025" />
    </svg>
    <div className="container mx-auto px-4">
      <div className="text-center mb-14">
        <p className="text-accent font-medium text-sm tracking-widest uppercase mb-2">About Us</p>
        <Link to="/who-we-are" className="text-3xl md:text-4xl font-bold mb-4 hover:text-accent transition-colors inline-block">Meet the Founders</Link>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          With combined experience spanning over 65 years in financial services, property and business management, Mark and Leah bring a hands-on, research-led approach to everything they do.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {founders.map((f) => (
          <div key={f.name} className="bg-card rounded-lg border p-8 hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-bold mb-1">{f.name}</h3>
            <p className="text-accent font-medium text-sm mb-4">{f.role}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">{f.bio}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default About;
