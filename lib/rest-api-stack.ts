import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { generateBatch } from "../shared/util";
import { songs, songArtists } from "../seed/songs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { AuthApi } from './auth-api'

export class RestAPIStack extends cdk.Stack {
  private userPoolId: string;
  private userPoolClientId: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, "UserPool", {
      signInAliases: { username: true, email: true },
      selfSignUpEnabled: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolId = userPool.userPoolId;

    const appClient = userPool.addClient("AppClient", {
      authFlows: { userPassword: true },
    });

    const userPoolClientId = appClient.userPoolClientId;

    new AuthApi(this, 'AuthServiceApi', {
      userPoolId: userPoolId,
      userPoolClientId: userPoolClientId,
    });

    //tables
    const songsTable = new dynamodb.Table(this, "SongsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Songs",
    });

    const songArtistsTable = new dynamodb.Table(this, "SongArtistTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "songId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "artistName", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "SongArtist",
    });

    //authorizer functions
    const authorizerFn = new lambdanode.NodejsFunction(this, "AuthorizerFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/auth/authorizer.ts`,
      handler: "handler",
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        CLIENT_ID: appClient.userPoolClientId,
        REGION: cdk.Aws.REGION,
      },
    });

    const requestAuthorizer = new apig.RequestAuthorizer(this, "RequestAuthorizer", {
      identitySources: [apig.IdentitySource.header("cookie")],
      handler: authorizerFn,
      resultsCacheTtl: cdk.Duration.minutes(0),
    });


    //song functions
    const getSongByIdFn = new lambdanode.NodejsFunction(this, "GetSongByIdFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getSongById.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: songsTable.tableName,
        REGION: "eu-west-1",
      },
    });

    const getAllSongsFn = new lambdanode.NodejsFunction(this, "GetAllSongsFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getAllSongs.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: songsTable.tableName,
        REGION: "eu-west-1",
      },
    });

    const newSongFn = new lambdanode.NodejsFunction(this, "AddSongFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/addSong.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: songsTable.tableName,
        REGION: "eu-west-1",
      },
    });

    const deleteSongFn = new lambdanode.NodejsFunction(this, "DeleteSongFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/deleteSong.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: songsTable.tableName,
        REGION: "eu-west-1",
      },
    });

    const updateSongFn = new lambdanode.NodejsFunction(this, "UpdateSongFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/updateSong.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: songsTable.tableName,
        REGION: "eu-west-1",
      },
    });

    const getSongArtistFn = new lambdanode.NodejsFunction(
      this,
      "GetSongArtistFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/getSongArtist.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: songArtistsTable.tableName,
          REGION: "eu-west-1",
        },
      }
    );

    new custom.AwsCustomResource(this, "songsddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [songsTable.tableName]: generateBatch(songs),
            [songArtistsTable.tableName]: generateBatch(songArtists),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("songsddbInitData"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [songsTable.tableArn, songArtistsTable.tableArn],
      }),
    });

    //permissions
    songsTable.grantReadData(getSongByIdFn);
    songsTable.grantReadData(getAllSongsFn);
    songsTable.grantReadWriteData(newSongFn);
    songsTable.grantReadWriteData(deleteSongFn);
    songsTable.grantReadWriteData(updateSongFn);
    songArtistsTable.grantReadData(getSongArtistFn);


    //api gateway
    const api = new apig.RestApi(this, "RestAPI", {
      description: "demo api",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });


    //endpoints
    const songsEndpoint = api.root.addResource("songs");
    songsEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getAllSongsFn, { proxy: true })
    );

    const songEndpoint = songsEndpoint.addResource("{songId}");
    songEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getSongByIdFn, { proxy: true })
    );

    songsEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(newSongFn, { proxy: true }),
      {
        authorizer: requestAuthorizer,
        authorizationType: apig.AuthorizationType.CUSTOM,
      }
    );

    songEndpoint.addMethod(
      "DELETE",
      new apig.LambdaIntegration(deleteSongFn, { proxy: true }),
      {
        authorizer: requestAuthorizer,
        authorizationType: apig.AuthorizationType.CUSTOM,
      }
    );

    songEndpoint.addMethod(
      "PUT",
      new apig.LambdaIntegration(updateSongFn, { proxy: true }),
      {
        authorizer: requestAuthorizer,
        authorizationType: apig.AuthorizationType.CUSTOM,
      }
    );

    const songArtistEndpoint = songsEndpoint.addResource("artist");
    songArtistEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getSongArtistFn, { proxy: true })
    );
  }
}
