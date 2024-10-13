import java.io.BufferedReader;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.Writer;

public class JsonToCsv {

    public static void main(String[] args) {
        // Path to your JSON file
        String jsonFilePath = "poste.json";

        try {
            // Read the JSON file into a String
            BufferedReader reader = new BufferedReader(new FileReader(jsonFilePath));
            StringBuilder jsonStringBuilder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                jsonStringBuilder.append(line);
            }
            reader.close();

            // Get the entire JSON string
            String jsonString = jsonStringBuilder.toString();

            // Manually parse the JSON (basic implementation, no external libraries)
            // Extract the results array content
            String[] items = jsonString.split("\\{\\s*\"objectId\"");

            // Create CSV file
            Writer csvWriter = new OutputStreamWriter(new FileOutputStream("poste.csv"), "windows-1250");

            // Write CSV header
            csvWriter.append("objectId,latitude,longitude,postalCode,place\n");

            // Parse each result block and write to CSV
            for (int i = 1; i < items.length; i++) {
                String item = "{\"objectId\"" + items[i];
                String objectId = extractValue(item, "\"objectId\"");
                String latitude = extractValue(item, "\"latitude\"");
                String longitude = extractValue(item, "\"longitude\"");
                String postalCode = extractValue(item, "\"postalCode\"");
                String place = extractValue(item, "\"place\"");

                // Write to CSV
                csvWriter.append(objectId).append(",");
                csvWriter.append(latitude).append(",");
                csvWriter.append(longitude).append(",");
                csvWriter.append(postalCode).append(",");
                csvWriter.append(place).append("\n");
            }

            // Close the writer
            csvWriter.flush();
            csvWriter.close();

            System.out.println("CSV file created successfully!");

        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    // A helper function to extract the value of a field from a JSON-like string
    private static String extractValue(String json, String key) {
        int startIndex = json.indexOf(key) + key.length() + 2;
        int endIndex;

        // Handle if it's a string (starts and ends with quotes)
        if (json.charAt(startIndex) == '"') {
            startIndex++;
            endIndex = json.indexOf('"', startIndex);
        } else {
            // Otherwise, it's a number or object (find the first non-number or non-period
            // character)
            endIndex = startIndex;
            while (endIndex < json.length() && (Character.isDigit(json.charAt(endIndex)) || json.charAt(endIndex) == '.'
                    || json.charAt(endIndex) == '-')) {
                endIndex++;
            }
        }

        return json.substring(startIndex, endIndex);
    }
}