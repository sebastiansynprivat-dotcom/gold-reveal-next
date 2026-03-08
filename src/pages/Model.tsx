import { Construction } from "lucide-react";

const Model = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
          <Construction className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Coming Soon</h1>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Diese Seite wird gerade aufgebaut. Schau bald wieder vorbei!
        </p>
      </div>
    </div>
  );
};

export default Model;
