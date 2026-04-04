interface Props { message?: string; }
export default function LoadingSpinner({ message = 'Cargando...' }: Props) {
  return (
    <div className="text-center py-20">
      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
      <p className="text-slate-500 mt-4 text-sm">{message}</p>
    </div>
  );
}
