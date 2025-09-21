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
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-blue-200 to-purple-200 dark:from-blue-900 dark:to-purple-900">
      {welcomeImage && (
        <Image
          src={welcomeImage.imageUrl}
          alt={welcomeImage.description}
          fill
          className="object-cover -z-10 opacity-30"
          data-ai-hint={welcomeImage.imageHint}
          priority
        />
      )}
      <div className="absolute inset-0 bg-background/20 dark:bg-background/50 backdrop-blur-sm -z-10" />

      <Card className="max-w-xl w-full text-center shadow-2xl animate-fade-in-up bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg border-white/30">
        <CardHeader>
          <div className="flex justify-center items-center gap-4 mb-4">
            <Logo className="h-20 w-20 text-blue-600 dark:text-blue-400" />
            <h1 className="font-headline text-6xl font-bold tracking-tighter text-gray-800 dark:text-gray-100">
              Atomic Canvas
            </h1>
          </div>
          <CardTitle className="font-headline text-4xl font-bold text-blue-700 dark:text-blue-300">
            Tu Laboratorio de Química Práctico
          </CardTitle>
          <CardDescription className="text-lg pt-2 text-gray-600 dark:text-gray-300">
            Sumérgete en el mundo de los átomos y las moléculas en realidad aumentada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground dark:text-gray-400">
            Usa tus manos para construir, explorar y aprender en una experiencia inmersiva. No se necesitan gafas, solo tu cámara web y tu curiosidad.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild size="lg" className="font-bold text-lg bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600">
            <Link href="/lab">
              <FlaskConical className="mr-2 h-5 w-5" />
              Lanzar Laboratorio
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
