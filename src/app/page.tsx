import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { FlaskConical } from 'lucide-react';
import { Logo } from '@/components/common/logo';

export default function WelcomePage() {
  const welcomeImage = PlaceHolderImages.find((img) => img.id === 'welcome-bg');

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4">
      {welcomeImage && (
        <Image
          src={welcomeImage.imageUrl}
          alt={welcomeImage.description}
          fill
          className="object-cover -z-10"
          data-ai-hint={welcomeImage.imageHint}
          priority
        />
      )}
      <div className="absolute inset-0 bg-background/60 dark:bg-background/80 backdrop-blur-sm -z-10" />

      <Card className="max-w-xl w-full text-center shadow-2xl animate-fade-in-up">
        <CardHeader>
          <div className="flex justify-center items-center gap-4 mb-4">
            <Logo className="h-16 w-16" />
            <h1 className="font-headline text-5xl font-bold tracking-tighter">
              Atomic Canvas
            </h1>
          </div>
          <CardTitle className="font-headline text-3xl font-bold">
            Your Hands-On Chemistry Lab
          </CardTitle>
          <CardDescription className="text-lg pt-2">
            Dive into the world of atoms and molecules in augmented reality.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Use your hands to build, explore, and learn in an immersive experience. No goggles required, just your webcam and your curiosity.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild size="lg" className="font-bold text-lg">
            <Link href="/lab">
              <FlaskConical className="mr-2 h-5 w-5" />
              Launch Lab
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
