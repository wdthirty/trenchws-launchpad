import * as Sentry from "@sentry/nextjs";
import { NextPageContext } from "next";
import { ErrorProps } from "next/error";

interface CustomErrorProps extends ErrorProps {
  statusCode: number;
}

const CustomErrorComponent = ({ statusCode }: CustomErrorProps) => {
  return <div>Error {statusCode}</div>;
};

CustomErrorComponent.getInitialProps = async (contextData: NextPageContext) => {
  // In case this is running in a serverless function, await this in order to give Sentry
  // time to send the error before the lambda exits
  await Sentry.captureUnderscoreErrorException(contextData);

  // This will contain the status code of the response
  return { statusCode: contextData.res?.statusCode || 500 };
};

export default CustomErrorComponent;
