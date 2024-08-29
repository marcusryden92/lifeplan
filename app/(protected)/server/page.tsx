import { UserInfo } from "@/components/auth/user-info";
import { currentUser } from "@/lib/auth";

const ServerPage = async () => {
  const user = await currentUser();

  return <UserInfo label="Server component" user={user}></UserInfo>;
};

export default ServerPage;
