import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { generateBatch } from "../shared/util";
import { songs } from "../seed/songs";
import * as apig from "aws-cdk-lib/aws-apigateway";

export class RestAPIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Tables 
    const songsTable = new dynamodb.Table(this, "SongsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Songs",
    });

    
    // Functions 
    const getSongByIdFn = new lambdanode.NodejsFunction(
      this,
      "GetSongByIdFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/getSongById.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: songsTable.tableName,
          REGION: 'eu-west-1',
        },
      }
      );
      
      const getAllSongsFn = new lambdanode.NodejsFunction(
        this,
        "GetAllSongssFn",
        {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_18_X,
          entry: `${__dirname}/../lambdas/getAllSongs.ts`,
          timeout: cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
            TABLE_NAME: songsTable.tableName,
            REGION: 'eu-west-1',
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
              },
            },
            physicalResourceId: custom.PhysicalResourceId.of("songsddbInitData"), //.of(Date.now().toString()),
          },
          policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
            resources: [songsTable.tableArn],
          }),
        });
        
        // Permissions 
        songsTable.grantReadData(getSongByIdFn)
        songsTable.grantReadData(getAllSongsFn)
        

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
        
      }
    }
    