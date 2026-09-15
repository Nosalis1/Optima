import Header from "./header";
import Sidebar from "./sidebar";
import Footer from "./footer";

const Screen = ({
    children
}: { children: React.ReactNode }) => {
    return (
        <div className="flex flex-col w-full h-screen overflow-hidden">
            <Header />
            <div className="flex flex-row w-full h-full overflow-hidden">
                <Sidebar />
                <div className="flex flex-col w-full h-full overflow-auto">
                    {children}
                    <Footer />
                </div>
            </div>
        </div>
    )
}

export default Screen;