using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PumpSimulator

{
    public class PumpTelemetry
    {
        public string id { get; set; }
        public double capacitym3 { get; set; }

        public string state { get; set; }

    }
}
