import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App() {
  const [file, setFile] = React.useState(null);
  const [message, setMessage] = React.useState("");
  const [result, setResult] = React.useState(null);

  async function uploadFile(event) {
    event.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setMessage("Uploading...");
    setResult(null);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      setResult(result);
      setMessage(
        `Uploaded successfully. ${result.employees.length} employees found.`,
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main>
      <h1>Employee Payroll Calculator</h1>
      <form onSubmit={uploadFile}>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(event) => {
            setFile(event.target.files[0] || null);
            setMessage("");
          }}
        />
        <button type="submit" disabled={!file}>
          Upload
        </button>
      </form>
      {message && <p role="status">{message}</p>}
      {result && (
        <section>
          <p>Working days: {result.workingDayCount}</p>
          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Designation</th>
                <th>Present Days</th>
                <th>Leave</th>
                <th>WFH</th>
                <th>Monthly Salary</th>
                <th>Calculated Salary</th>
              </tr>
            </thead>
            <tbody>
              {result.employees.map((employee, index) => (
                <EmployeeRow
                  key={`${employee.employeeId}-${index}`}
                  employee={{
                    ...employee,
                    workingDayCount: result.workingDayCount,
                  }}
                />
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}

function EmployeeRow({ employee }) {
  const [salary, setSalary] = React.useState("");
  const monthlySalary = Number(salary);

  const paidDays = Number(employee.p) + Number(employee.wfh) * 0.5;

  const calculatedSalary =
    salary !== "" && employee.workingDayCount > 0
      ? ((monthlySalary / employee.workingDayCount) * paidDays).toFixed(2)
      : "";

  return (
    <tr>
      <td>{employee.employeeId}</td>
      <td>{employee.name}</td>
      <td>{employee.designation}</td>
      <td>{employee.p}</td>
      <td>{employee.l}</td>
      <td>{employee.wfh}</td>
      <td>
        <input
          type="number"
          min="0"
          step="0.01"
          aria-label={`Monthly salary for ${employee.name}`}
          value={salary}
          onChange={(event) => setSalary(event.target.value)}
        />
      </td>
      <td>{calculatedSalary}</td>
    </tr>
  );
}

createRoot(document.getElementById("root")).render(<App />);
