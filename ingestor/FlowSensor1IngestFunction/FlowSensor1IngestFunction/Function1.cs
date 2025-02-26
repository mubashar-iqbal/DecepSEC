// Default URL for triggering event grid function in the local environment.
// http://localhost:7071/runtime/webhooks/EventGrid?functionName={functionname}
using System;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.EventGrid;
using Microsoft.Extensions.Logging;
using Azure.Messaging.EventGrid;

//TO interact with Azure ADT
using Azure.DigitalTwins.Core;
using Azure.Identity;
using System.Net.Http;
using Azure.Core.Pipeline;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json;
using Azure;
using System.Numerics;
using static Microsoft.ApplicationInsights.MetricDimensionNames.TelemetryContext;
using Microsoft.Azure.Functions.Worker;


namespace FlowSensor1IngestFunction
{
    public static class Function1
    {
        // ADT Instance
        private static readonly string adtInstanceUrl = Environment.GetEnvironmentVariable("ADT_SERVICE_URL");
        private static readonly HttpClient httpClient = new HttpClient();

        [FunctionName("IOTHubToFIT101ADTFunction")]
        public static async Task Run([EventGridTrigger] EventGridEvent eventGridEvent, ILogger log)
        {
            log.LogInformation(eventGridEvent.Data.ToString());

            if (adtInstanceUrl == null) log.LogError("Application setting \"ADT_SERVICE_URL\" not set");

            try
            {
                //Managed Identity Credentials
                var cred = new DefaultAzureCredential();

                //Instantiate ADT Client
                var adtClient = new DigitalTwinsClient(new Uri(adtInstanceUrl), cred);

                // Log successful connection creation
                log.LogInformation($"FIT101 ADT client connection created!");

                //if we receive data
                if (eventGridEvent != null && eventGridEvent.Data != null)
                {
                    //Log the data
                    log.LogInformation(eventGridEvent.Data.ToString());

                    //Covert to json
                    JObject FIT101Message = (JObject)JsonConvert.DeserializeObject(eventGridEvent.Data.ToString());

                    //Get device data from object
                    string FIT101Id = (String)FIT101Message["systemProperties"]["iothub-connection-device-id"];

                    int FlowRateLs = (int)FIT101Message["body"]["FlowRateLs"];


                    //Log the telemetry
                    log.LogInformation($"Device: {FIT101Id} FlowRateLs: {FlowRateLs}");

                    var updateFIT101TwinData = new JsonPatchDocument();
                    updateFIT101TwinData.AppendReplace("/FlowRateLs", FlowRateLs);


                    await adtClient.UpdateDigitalTwinAsync(FIT101Id, updateFIT101TwinData).ConfigureAwait(false);
                }
            }
            catch (Exception ex)
            {
                log.LogError($"Error in FIT101 Ingest Function: {ex.Message}");
            }
        }
    }
}

