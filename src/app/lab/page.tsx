import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card';
import { Loader } from 'lucide-react';

const AtomicCanvasClient = dynamic(() => import('./atomic-canvas-client'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-background">
      <Card className="max-w-sm">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 animate-spin text-primary" />
          <p className="font-semibold text-lg">Initializing AR Environment...</p>
          <p className="text-muted-foreground text-sm text-center">Please allow camera access when prompted.</p>
        </CardContent>
      </Card>
    </div>
  ),
})

export default function LabPage() {
  return <AtomicCanvasClient />;
}
