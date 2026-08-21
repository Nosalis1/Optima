import OptimaGaugeIcon from "@/app/components/shared/optima";

type Props = {
    text?: string;
}

const Loading = ({
    text = "Loading..."
}: Props) => {
    return (
        <div className="flex items-center justify-center h-screen w-screen flex-col">
            <div className="flex items-center justify-center w-20 h-20 mb-4">
                <div className="w-20 h-20 absolute rounded-full border-2 border-accent-soft animate-spin border-t-accent"></div>
                <OptimaGaugeIcon size={60} color='var(--color-foreground)' />
            </div>
            <p className="text-lg">{text}</p>
        </div>
    );
}

export default Loading;