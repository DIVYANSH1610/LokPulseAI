
export default function GradientHeading({
  title,
  subtitle
}:{
  title:string;
  subtitle?:string;
}){
  return(
    <div className="space-y-4">
      <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-blue-700 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
        {title}
      </h1>

      {subtitle && (
        <p className="text-lg text-slate-600 max-w-3xl">
          {subtitle}
        </p>
      )}
    </div>
  )
}
