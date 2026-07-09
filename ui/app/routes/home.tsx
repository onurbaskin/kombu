export function meta() {
  return [
    { title: "Kombu" },
    {
      name: "description",
      content:
        "A self-hostable kitchen OS for recipes, inventory, and shopping.",
    },
  ];
}

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <p className="text-muted-foreground text-lg font-medium">
        Welcome to Kombu
      </p>
      <p className="text-muted-foreground text-sm max-w-md">
        Kitchen command center coming soon. Start by browsing your recipes or
        managing your inventory.
      </p>
    </div>
  );
}
