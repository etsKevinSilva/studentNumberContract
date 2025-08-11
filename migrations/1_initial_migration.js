const StudentContract = artifacts.require("StudentContract");
const PubSubContract = artifacts.require("PubSubContract");

module.exports = function (deployer) {
  deployer.deploy(StudentContract);
  deployer.deploy(PubSubContract);
};
