import { useEffect, useRef, useCallback } from "react";

interface GoldParticlesProps {
  /** Lower = more subtle. Default 0.3 (subtle for admin). Auth uses ~0.5 */
  spawnRate?: number;
  /** Max particles on screen */
  maxParticles?: number;
  /** Particle base opacity */
  baseOpacity?: number;
}

export default function GoldParticles({ 
  spawnRate = 0.25, 
  maxParticles = 25, 
  baseOpacity = 0.2 
}: GoldParticlesProps) {
  const particlesRef = useRef<{ x: number; y: number; size: number; opacity: number; vx: number; vy: number; life: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (Math.random() > spawnRate) return;
    particlesRef.current.push({
      x: e.clientX + (Math.random() - 0.5) * 8,
      y: e.clientY + (Math.random() - 0.5) * 8,
      size: 1 + Math.random() * 2,
      opacity: baseOpacity + Math.random() * 0.2,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6 - 0.2,
      life: 1,
    });
    if (particlesRef.current.length > maxParticles) {
      particlesRef.current = particlesRef.current.slice(-maxParticles);
    }
  }, [spawnRate, maxParticles, baseOpacity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.018;
        const alpha = Math.max(0, p.life) * p.opacity;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
        grad.addColorStop(0, `hsla(43, 76%, 56%, ${alpha})`);
        grad.addColorStop(0.4, `hsla(43, 56%, 52%, ${alpha * 0.4})`);
        grad.addColorStop(1, `hsla(43, 56%, 52%, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(43, 76%, 68%, ${alpha})`;
        ctx.fill();
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [handleMouseMove]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.7 }}
    />
  );
}
