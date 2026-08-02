import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      // Respetamos el área segura de iOS (notch/Dynamic Island arriba y barra
      // inferior) para que el aviso no tape la cabecera ni los botones.
      offset={{
        top: "calc(env(safe-area-inset-top) + 12px)",
        bottom: "calc(env(safe-area-inset-bottom) + 12px)",
        left: "12px",
        right: "12px",
      }}
      mobileOffset={{
        top: "calc(env(safe-area-inset-top) + 8px)",
        bottom: "calc(env(safe-area-inset-bottom) + 8px)",
        left: "8px",
        right: "8px",
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:w-full group-[.toaster]:max-w-[min(100vw-16px,420px)]",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:break-words",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};


export { Toaster };
